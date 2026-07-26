import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rolePermissions, type UserRole } from "@/lib/db/schema";
import { isRbacAccessUiEnabled } from "@/lib/features";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type EditableRole,
  type Permission,
} from "@/lib/auth/role-defaults";

export type { EditableRole };

export async function getPermissionsForRole(
  role: UserRole
): Promise<Permission[]> {
  if (role === "ADMIN") {
    return DEFAULT_ROLE_PERMISSIONS.ADMIN;
  }

  if (!isRbacAccessUiEnabled()) {
    return DEFAULT_ROLE_PERMISSIONS[role];
  }

  const db = getDb();
  const rows = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(eq(rolePermissions.role, role));

  if (rows.length === 0) {
    return DEFAULT_ROLE_PERMISSIONS[role];
  }

  return rows.map((row) => row.permission as Permission);
}

export async function replaceRolePermissions(
  role: EditableRole,
  permissions: Permission[]
) {
  const db = getDb();
  const unique = [...new Set(permissions)];

  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.role, role));
    if (unique.length > 0) {
      await tx.insert(rolePermissions).values(
        unique.map((permission) => ({ role, permission }))
      );
    }
  });
}
