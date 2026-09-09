"use server";

import { z } from "zod";
import { revalidateAccessPages } from "@/lib/actions/revalidate";
import type { ActionState } from "@/lib/actions/inventory";
import {
  getGrantableNavCatalog,
  permissionsGrantedByNavItem,
  type Permission,
} from "@/lib/auth/rbac";
import { and, eq } from "drizzle-orm";
import {
  assertTenantRole,
  createTenantRole,
  deleteTenantRole,
  getPermissionsForRoleIds,
  isPrimeForSession,
  listRolesForTenant,
  replaceRolePermissions,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getStaffById, listStaffForAccess } from "@/lib/staff/service";
import { isReservedPrimeName } from "@/lib/auth/role-defaults";

export type AccessRole = { id: string; name: string };

export async function getAccessConfiguration() {
  const session = await requireTenantSession();
  if (!(await isPrimeForSession(session))) {
    return null;
  }

  const staffPromise = listStaffForAccess(session.tenantId);
  const tenantRoles = (await listRolesForTenant(session.tenantId)).filter(
    (role) => !isReservedPrimeName(role.name)
  );

  const [staff, permissionsByRoleId] = await Promise.all([
    staffPromise,
    getPermissionsForRoleIds(tenantRoles.map((role) => role.id)),
  ]);

  return {
    catalog: getGrantableNavCatalog(),
    roles: tenantRoles.map(({ id, name }) => ({ id, name })) satisfies AccessRole[],
    assignableRoles: tenantRoles.map(({ id, name }) => ({
      id,
      name,
    })) satisfies AccessRole[],
    permissionsByRoleId,
    staff,
    adminRoleId: null as string | null,
  };
}

export async function saveRoleAccessAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await isPrimeForSession(session))) {
    return { success: false, error: "You do not have permission." };
  }

  const roleIdParsed = z.string().uuid().safeParse(formData.get("roleId"));
  if (!roleIdParsed.success) {
    return { success: false, error: "Invalid role." };
  }
  const roleId = roleIdParsed.data;

  if (!(await assertTenantRole(session.tenantId, roleId))) {
    return { success: false, error: "Invalid role." };
  }

  const catalog = getGrantableNavCatalog();
  const selectedHrefs = new Set(formData.getAll("routes").map(String));

  const permissions: Permission[] = [];
  for (const item of catalog) {
    if (!selectedHrefs.has(item.href)) continue;
    permissions.push(...permissionsGrantedByNavItem(item));
  }

  await replaceRolePermissions(roleId, permissions);
  revalidateAccessPages();

  return {
    success: true,
    message: "Access saved.",
  };
}

export async function createRoleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await isPrimeForSession(session))) {
    return { success: false, error: "You do not have permission." };
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { success: false, error: "Role name is required." };
  }
  if (isReservedPrimeName(name)) {
    return {
      success: false,
      error: "Prime is reserved and cannot be created as a role.",
    };
  }

  try {
    await createTenantRole(session.tenantId, name);
    revalidateAccessPages();
    return { success: true, message: `Role "${name}" created.` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create role.",
    };
  }
}

export async function saveStaffAccessAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await isPrimeForSession(session))) {
    return { success: false, error: "You do not have permission." };
  }

  const staffIdParsed = z.string().uuid().safeParse(formData.get("staffId"));
  const roleIdParsed = z.string().uuid().safeParse(formData.get("roleId"));
  if (!staffIdParsed.success) {
    return { success: false, error: "Select a staff member." };
  }
  if (!roleIdParsed.success) {
    return { success: false, error: "Select a role." };
  }

  const staffId = staffIdParsed.data;
  const roleId = roleIdParsed.data;

  const staff = await getStaffById(session.tenantId, staffId);
  if (!staff) {
    return { success: false, error: "Staff not found." };
  }
  if (staff.isPrime || isReservedPrimeName(staff.username)) {
    return {
      success: false,
      error: "Prime users do not use roles.",
    };
  }

  if (!(await assertTenantRole(session.tenantId, roleId))) {
    return { success: false, error: "Invalid role." };
  }

  const db = getDb();
  await db
    .update(users)
    .set({ roleId })
    .where(and(eq(users.id, staffId), eq(users.tenantId, session.tenantId)));

  const catalog = getGrantableNavCatalog();
  const selectedHrefs = new Set(formData.getAll("routes").map(String));
  const permissions: Permission[] = [];
  for (const item of catalog) {
    if (!selectedHrefs.has(item.href)) continue;
    permissions.push(...permissionsGrantedByNavItem(item));
  }
  await replaceRolePermissions(roleId, permissions);

  revalidateAccessPages();

  return {
    success: true,
    message: "Staff access saved.",
  };
}

export async function deleteRoleAction(roleId: string): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await isPrimeForSession(session))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = z.string().uuid().safeParse(roleId);
  if (!parsed.success) {
    return { success: false, error: "Invalid role." };
  }

  try {
    await deleteTenantRole(session.tenantId, parsed.data);
    revalidateAccessPages();
    return { success: true, message: "Role deleted." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete role.",
    };
  }
}
