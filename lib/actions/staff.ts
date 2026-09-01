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

const staffSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).optional(),
  isActive: z.coerce.boolean(),
});

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
    username: formData.get("username"),
    password: formData.get("password") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "username") {
      return { success: false, error: "Invalid username." };
    }
    if (path === "password") {
      return {
        success: false,
        error: "Password must be at least 6 characters.",
      };
    }
    if (path === "name") {
      return { success: false, error: "Name is required." };
    }
    return { success: false, error: "Please check all required fields." };
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
    } = {
      name: parsed.data.name,
      username,
      isActive: parsed.data.isActive,
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
