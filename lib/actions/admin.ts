"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  revalidateProductPages,
  revalidateUserPages,
} from "@/lib/actions/revalidate";
import { getDb } from "@/lib/db";
import { oilProducts, roles, users } from "@/lib/db/schema";
import { hasPermission } from "@/lib/auth/rbac";
import {
  assertTenantRole,
  listRolesForTenant,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { isReservedPrimeName } from "@/lib/auth/role-defaults";
import type { ActionState } from "@/lib/actions/inventory";

const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    unit: z.enum(["litre", "millilitre"]),
    lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
    packetsPerBox: z.coerce.number().int().positive().optional(),
    volumePerPacket: z.coerce.number().positive().optional(),
    isActive: z.coerce.boolean(),
  })
  .refine(
    (data) => {
      const hasPackets = data.packetsPerBox != null;
      const hasVolume = data.volumePerPacket != null;
      return hasPackets === hasVolume;
    },
    {
      message: "Set both pieces per case and volume per piece, or leave both blank.",
    }
  );

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "products:manage"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = productSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    unit: formData.get("unit"),
    lowStockThreshold: formData.get("lowStockThreshold") || undefined,
    packetsPerBox: formData.get("packetsPerBox") || undefined,
    volumePerPacket: formData.get("volumePerPacket") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check all required fields.",
    };
  }

  const volumePerBox =
    parsed.data.packetsPerBox && parsed.data.volumePerPacket
      ? parsed.data.packetsPerBox * parsed.data.volumePerPacket
      : null;

  const db = getDb();
  const values = {
    name: parsed.data.name,
    unit: parsed.data.unit,
    costPrice: "0",
    sellingPrice: "0",
    lowStockThreshold: parsed.data.lowStockThreshold
      ? String(parsed.data.lowStockThreshold)
      : null,
    packetsPerBox: parsed.data.packetsPerBox
      ? String(parsed.data.packetsPerBox)
      : null,
    volumePerPacket: parsed.data.volumePerPacket
      ? String(parsed.data.volumePerPacket)
      : null,
    volumePerBox: volumePerBox ? String(volumePerBox) : null,
    isActive: parsed.data.isActive,
  };

  if (parsed.data.id) {
    await db
      .update(oilProducts)
      .set(values)
      .where(
        and(
          eq(oilProducts.id, parsed.data.id),
          eq(oilProducts.tenantId, session.tenantId)
        )
      );
  } else {
    await db.insert(oilProducts).values({ ...values, tenantId: session.tenantId });
  }

  revalidateProductPages();
  return { success: true, message: "Product saved." };
}

export async function deactivateProductAction(
  productId: string
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "products:manage"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsedId = z.string().uuid().safeParse(productId);
  if (!parsedId.success) {
    return { success: false, error: "Invalid product." };
  }

  const db = getDb();
  await db
    .update(oilProducts)
    .set({ isActive: false })
    .where(
      and(
        eq(oilProducts.id, parsedId.data),
        eq(oilProducts.tenantId, session.tenantId)
      )
    );

  revalidateProductPages();
  return { success: true, message: "Product deactivated." };
}

export async function reactivateProductAction(
  productId: string
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "products:manage"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsedId = z.string().uuid().safeParse(productId);
  if (!parsedId.success) {
    return { success: false, error: "Invalid product." };
  }

  const db = getDb();
  await db
    .update(oilProducts)
    .set({ isActive: true })
    .where(
      and(
        eq(oilProducts.id, parsedId.data),
        eq(oilProducts.tenantId, session.tenantId)
      )
    );

  revalidateProductPages();
  return { success: true, message: "Product reactivated." };
}

const userSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  roleId: z.string().uuid(),
  password: z.string().min(6).optional(),
  isActive: z.coerce.boolean(),
});

export async function saveUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "users:manage"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = userSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    username: formData.get("username"),
    roleId: formData.get("roleId"),
    password: formData.get("password") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: "Please check all required fields." };
  }

  if (!parsed.data.id && !parsed.data.password) {
    return { success: false, error: "Password is required for new users." };
  }

  if (!(await assertTenantRole(session.tenantId, parsed.data.roleId))) {
    return { success: false, error: "Invalid role." };
  }

  const username = parsed.data.username.toLowerCase();
  if (isReservedPrimeName(username) || isReservedPrimeName(parsed.data.name)) {
    return {
      success: false,
      error: "Prime is reserved. Only Platform can provision the Prime user.",
    };
  }

  const db = getDb();

  // Never allow assigning a role named Prime if one somehow exists.
  const rolesForTenant = await listRolesForTenant(session.tenantId);
  const selectedRole = rolesForTenant.find((r) => r.id === parsed.data.roleId);
  if (selectedRole && isReservedPrimeName(selectedRole.name)) {
    return {
      success: false,
      error: "Prime is reserved and cannot be assigned as a role.",
    };
  }

  if (parsed.data.id) {
    const [existing] = await db
      .select({
        tenantId: users.tenantId,
        isPlatformAdmin: users.isPlatformAdmin,
        isPrime: users.isPrime,
      })
      .from(users)
      .where(eq(users.id, parsed.data.id))
      .limit(1);

    if (
      !existing ||
      existing.isPlatformAdmin ||
      existing.isPrime ||
      existing.tenantId !== session.tenantId
    ) {
      return { success: false, error: "User not found." };
    }

    const update: {
      name: string;
      username: string;
      roleId: string;
      isActive: boolean;
      passwordHash?: string;
    } = {
      name: parsed.data.name,
      username,
      roleId: parsed.data.roleId,
      isActive: parsed.data.isActive,
    };

    if (parsed.data.password) {
      update.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    await db.update(users).set(update).where(eq(users.id, parsed.data.id));
  } else {
    await db.insert(users).values({
      tenantId: session.tenantId,
      roleId: parsed.data.roleId,
      name: parsed.data.name,
      username,
      isActive: parsed.data.isActive,
      isPlatformAdmin: false,
      isPrime: false,
      passwordHash: await bcrypt.hash(parsed.data.password!, 10),
    });
  }

  revalidateUserPages();
  return { success: true, message: "User saved." };
}

export async function getAllUsers() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "users:manage"))) {
    return [];
  }

  const db = getDb();
  return db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      isActive: users.isActive,
      roleId: users.roleId,
      roleName: roles.name,
      teamId: users.teamId,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(
      and(
        eq(users.tenantId, session.tenantId),
        eq(users.isPlatformAdmin, false),
        eq(users.isPrime, false)
      )
    )
    .orderBy(users.name);
}

/** Role choices for the Add/Edit User form. */
export async function getUserRoleOptions() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "users:manage"))) {
    return [];
  }

  const tenantRoles = await listRolesForTenant(session.tenantId);
  return tenantRoles
    .filter((role) => !isReservedPrimeName(role.name))
    .map(({ id, name }) => ({ id, name }));
}
