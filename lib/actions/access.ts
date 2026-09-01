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
  getPermissionsForRoleId,
  isSystemAdminRole,
  listRolesForTenant,
  replaceRolePermissions,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { SYSTEM_ADMIN_ROLE_NAME } from "@/lib/auth/role-defaults";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  countActiveAdmins,
  getStaffById,
  isAdminStaff,
  listStaff,
} from "@/lib/staff/service";

export type AccessRole = { id: string; name: string };

export async function getAccessConfiguration() {
  const session = await requireTenantSession();
  if (!(await isSystemAdminRole(session.roleId))) {
    return null;
  }

  const tenantRoles = await listRolesForTenant(session.tenantId);
  const editableRoles = tenantRoles.filter(
    (role) => !(role.isSystem && role.name === SYSTEM_ADMIN_ROLE_NAME)
  );

  const permissionsByRoleId: Record<string, Permission[]> = {};
  for (const role of editableRoles) {
    permissionsByRoleId[role.id] = await getPermissionsForRoleId(role.id);
  }

  return {
    catalog: getGrantableNavCatalog(),
    roles: editableRoles.map(({ id, name }) => ({ id, name })) satisfies AccessRole[],
    assignableRoles: tenantRoles.map(({ id, name }) => ({
      id,
      name,
    })) satisfies AccessRole[],
    permissionsByRoleId,
    staff: await listStaff(session.tenantId),
    adminRoleId: tenantRoles.find(
      (role) => role.isSystem && role.name === SYSTEM_ADMIN_ROLE_NAME
    )?.id ?? null,
  };
}

export async function saveRoleAccessAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await isSystemAdminRole(session.roleId))) {
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

  if (await isSystemAdminRole(roleId)) {
    return {
      success: false,
      error: "The Admin role always has full access.",
    };
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
  if (!(await isSystemAdminRole(session.roleId))) {
    return { success: false, error: "You do not have permission." };
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { success: false, error: "Role name is required." };
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
  if (!(await isSystemAdminRole(session.roleId))) {
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

  if (!(await assertTenantRole(session.tenantId, roleId))) {
    return { success: false, error: "Invalid role." };
  }

  const assigningAdmin = await isSystemAdminRole(roleId);
  if (assigningAdmin && !(await isSystemAdminRole(session.roleId))) {
    return {
      success: false,
      error: "Only an Admin can assign the Admin role.",
    };
  }

  if (
    isAdminStaff(staff) &&
    !assigningAdmin &&
    staff.isActive &&
    (await countActiveAdmins(session.tenantId, staff.id)) === 0
  ) {
    return {
      success: false,
      error: "Keep at least one active Admin.",
    };
  }

  const db = getDb();
  await db
    .update(users)
    .set({ roleId })
    .where(and(eq(users.id, staffId), eq(users.tenantId, session.tenantId)));

  if (!assigningAdmin) {
    const catalog = getGrantableNavCatalog();
    const selectedHrefs = new Set(formData.getAll("routes").map(String));
    const permissions: Permission[] = [];
    for (const item of catalog) {
      if (!selectedHrefs.has(item.href)) continue;
      permissions.push(...permissionsGrantedByNavItem(item));
    }
    await replaceRolePermissions(roleId, permissions);
  }

  revalidateAccessPages();

  return {
    success: true,
    message: "Staff access saved.",
  };
}

export async function deleteRoleAction(roleId: string): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await isSystemAdminRole(session.roleId))) {
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
