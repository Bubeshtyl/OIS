"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { ActionState } from "@/lib/actions/inventory";
import { revalidateStaffPages } from "@/lib/actions/revalidate";
import { requireTenantSession, isSystemAdminRole } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  countActiveAdmins,
  findUserIdByUsername,
  getStaffById,
  isAdminStaff,
  listStaff,
} from "@/lib/staff/service";

const requiredText = z.string().trim().min(1);
const phoneSchema = z.string().trim().regex(/^\d{10}$/);
const optionalPhoneSchema = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .refine((value) => value === null || /^\d{10}$/.test(value));

const staffSchema = z.object({
  id: z.string().uuid().optional(),
  name: requiredText,
  joiningDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  primaryPhone: phoneSchema,
  secondaryPhone: optionalPhoneSchema,
  doorNo: requiredText,
  street: requiredText,
  area: requiredText,
  townCity: requiredText,
  district: requiredText,
  pincode: z.string().trim().regex(/^\d{6}$/),
  aadharNumber: z.string().trim().regex(/^\d{1,16}$/),
  guardianName: requiredText,
  guardianRelationship: requiredText,
  guardianPhone: phoneSchema,
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).optional(),
  isActive: z.coerce.boolean(),
});

const staffFieldErrors: Record<string, string> = {
  name: "Name is required.",
  joiningDate: "Joining date is required.",
  primaryPhone: "Primary phone number is required.",
  secondaryPhone: "Secondary phone number is invalid.",
  doorNo: "Door no is required.",
  street: "Street is required.",
  area: "Area is required.",
  townCity: "Town/city is required.",
  district: "District is required.",
  pincode: "Pincode is required.",
  aadharNumber: "Aadhar number is required.",
  guardianName: "Guardian name is required.",
  guardianRelationship: "Guardian relationship is required.",
  guardianPhone: "Guardian phone number is required.",
  username: "Invalid username.",
  password: "Password must be at least 6 characters.",
};

function profileValues(data: z.infer<typeof staffSchema>) {
  return {
    joiningDate: data.joiningDate,
    primaryPhone: data.primaryPhone,
    secondaryPhone: data.secondaryPhone,
    doorNo: data.doorNo,
    street: data.street,
    area: data.area,
    townCity: data.townCity,
    district: data.district,
    pincode: data.pincode,
    aadharNumber: data.aadharNumber,
    guardianName: data.guardianName,
    guardianRelationship: data.guardianRelationship,
    guardianPhone: data.guardianPhone,
  };
}

async function requireStaffAccess() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "staff:read"))) {
    return { session: null, error: "You do not have permission." as const };
  }
  return { session, error: null };
}

export async function getStaffMembers() {
  const { session, error } = await requireStaffAccess();
  if (error || !session) return [];
  return listStaff(session.tenantId);
}

export async function saveStaffAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session, error } = await requireStaffAccess();
  if (error || !session) {
    return { success: false, error };
  }


  const parsed = staffSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    joiningDate: formData.get("joiningDate"),
    primaryPhone: formData.get("primaryPhone"),
    secondaryPhone: formData.get("secondaryPhone") ?? "",
    doorNo: formData.get("doorNo"),
    street: formData.get("street"),
    area: formData.get("area"),
    townCity: formData.get("townCity"),
    district: formData.get("district"),
    pincode: formData.get("pincode"),
    aadharNumber: formData.get("aadharNumber"),
    guardianName: formData.get("guardianName"),
    guardianRelationship: formData.get("guardianRelationship"),
    guardianPhone: formData.get("guardianPhone"),
    username: formData.get("username"),
    password: formData.get("password") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    const path = String(parsed.error.issues[0]?.path[0] ?? "");
    return {
      success: false,
      error: staffFieldErrors[path] ?? "Please check all required fields.",
    };
  }

  if (!parsed.data.id && !parsed.data.password) {
    return { success: false, error: "Password is required." };
  }

  const username = parsed.data.username.toLowerCase();
  const existingUsernameId = await findUserIdByUsername(username);
  if (existingUsernameId && existingUsernameId !== parsed.data.id) {
    return { success: false, error: "That username is already taken." };
  }

  const db = getDb();

  if (parsed.data.id) {
    const existing = await getStaffById(session.tenantId, parsed.data.id);
    if (!existing) {
      return { success: false, error: "Staff not found." };
    }

    if (
      isAdminStaff(existing) &&
      !(await isSystemAdminRole(session.roleId))
    ) {
      return { success: false, error: "You do not have permission." };
    }

    if (!parsed.data.isActive && existing.id === session.userId) {
      return { success: false, error: "You cannot deactivate your own account." };
    }

    if (
      !parsed.data.isActive &&
      existing.isActive &&
      isAdminStaff(existing) &&
      (await countActiveAdmins(session.tenantId, existing.id)) === 0
    ) {
      return {
        success: false,
        error: "Keep at least one active Admin.",
      };
    }

    const update: {
      name: string;
      username: string;
      isActive: boolean;
      passwordHash?: string;
    } & ReturnType<typeof profileValues> = {
      name: parsed.data.name,
      username,
      isActive: parsed.data.isActive,
      ...profileValues(parsed.data),
    };

    if (parsed.data.password) {
      update.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    await db
      .update(users)
      .set(update)
      .where(and(eq(users.id, parsed.data.id), eq(users.tenantId, session.tenantId)));
  } else {
    await db.insert(users).values({
      tenantId: session.tenantId,
      name: parsed.data.name,
      username,
      isActive: parsed.data.isActive,
      isPlatformAdmin: false,
      passwordHash: await bcrypt.hash(parsed.data.password!, 10),
      ...profileValues(parsed.data),
    });
  }

  revalidateStaffPages();
  return { success: true, message: "Staff saved." };
}

export async function setStaffActiveAction(
  staffId: string,
  isActive: boolean
): Promise<ActionState> {
  const { session, error } = await requireStaffAccess();
  if (error || !session) {
    return { success: false, error };
  }

  const parsedId = z.string().uuid().safeParse(staffId);
  if (!parsedId.success) {
    return { success: false, error: "Invalid staff." };
  }

  const existing = await getStaffById(session.tenantId, parsedId.data);
  if (!existing) {
    return { success: false, error: "Staff not found." };
  }

  if (
    isAdminStaff(existing) &&
    !(await isSystemAdminRole(session.roleId))
  ) {
    return { success: false, error: "You do not have permission." };
  }

  if (!isActive && existing.id === session.userId) {
    return { success: false, error: "You cannot deactivate your own account." };
  }

  if (
    !isActive &&
    existing.isActive &&
    isAdminStaff(existing) &&
    (await countActiveAdmins(session.tenantId, existing.id)) === 0
  ) {
    return {
      success: false,
      error: "Keep at least one active Admin.",
    };
  }

  const db = getDb();
  await db
    .update(users)
    .set({ isActive })
    .where(
      and(eq(users.id, parsedId.data), eq(users.tenantId, session.tenantId))
    );

  revalidateStaffPages();
  return {
    success: true,
    message: isActive ? "Staff activated." : "Staff deactivated.",
  };
}
