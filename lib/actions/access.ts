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
  getPermissionsForRole,
  replaceRolePermissions,
} from "@/lib/auth/permissions";
import type { EditableRole } from "@/lib/auth/role-defaults";
import { requireSession } from "@/lib/auth/session";
import { isRbacAccessUiEnabled } from "@/lib/features";

const editableRoleSchema = z.enum(["MANAGER", "ACCOUNTS"]);

export async function getAccessConfiguration() {
  if (!isRbacAccessUiEnabled()) {
    return null;
  }

  const session = await requireSession();
  if (session.role !== "ADMIN") {
    return null;
  }

  const [managerPermissions, accountsPermissions] = await Promise.all([
    getPermissionsForRole("MANAGER"),
    getPermissionsForRole("ACCOUNTS"),
  ]);

  return {
    catalog: getGrantableNavCatalog(),
    permissionsByRole: {
      MANAGER: managerPermissions,
      ACCOUNTS: accountsPermissions,
    } satisfies Record<EditableRole, Permission[]>,
  };
}

export async function saveRoleAccessAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!isRbacAccessUiEnabled()) {
    return { success: false, error: "Access configuration is disabled." };
  }

  const session = await requireSession();
  if (session.role !== "ADMIN") {
    return { success: false, error: "You do not have permission." };
  }

  const roleParsed = editableRoleSchema.safeParse(formData.get("role"));
  if (!roleParsed.success) {
    return { success: false, error: "Invalid role." };
  }

  const role = roleParsed.data;
  const catalog = getGrantableNavCatalog();
  const selectedHrefs = new Set(formData.getAll("routes").map(String));

  const permissions: Permission[] = [];
  for (const item of catalog) {
    if (!selectedHrefs.has(item.href)) continue;
    permissions.push(...permissionsGrantedByNavItem(item, role));
  }

  await replaceRolePermissions(role, permissions);
  revalidateAccessPages();

  return {
    success: true,
    message: `${role === "MANAGER" ? "Manager" : "Accounts"} access saved.`,
  };
}
