"use server";

import { z } from "zod";
import { revalidateAccessPages } from "@/lib/actions/revalidate";
import type { ActionState } from "@/lib/actions/inventory";
import {
  getGrantableNavCatalog,
  permissionsGrantedByNavItem,
  type Permission,
} from "@/lib/auth/rbac";
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
    permissionsByRoleId,
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
