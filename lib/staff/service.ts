import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";
import { SYSTEM_ADMIN_ROLE_NAME } from "@/lib/auth/role-defaults";

export type StaffMember = {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  roleId: string | null;
  roleName: string | null;
};

export async function listStaff(tenantId: string): Promise<StaffMember[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      isActive: users.isActive,
      roleId: users.roleId,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.tenantId, tenantId), eq(users.isPlatformAdmin, false)))
    .orderBy(users.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    isActive: row.isActive,
    roleId: row.roleId,
    roleName: row.roleName ?? null,
  }));
}

export async function getStaffById(tenantId: string, staffId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      tenantId: users.tenantId,
      name: users.name,
      username: users.username,
      isActive: users.isActive,
      roleId: users.roleId,
      isPlatformAdmin: users.isPlatformAdmin,
      roleName: roles.name,
      roleIsSystem: roles.isSystem,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.id, staffId), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!row || row.isPlatformAdmin) return null;
  return row;
}

export async function findUserIdByUsername(username: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return row?.id ?? null;
}

export async function countActiveAdmins(
  tenantId: string,
  exceptUserId?: string
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true),
        eq(users.isPlatformAdmin, false),
        eq(roles.name, SYSTEM_ADMIN_ROLE_NAME),
        eq(roles.isSystem, true)
      )
    );

  return rows.filter((row) => row.id !== exceptUserId).length;
}

export function isAdminStaff(staff: {
  roleName: string | null;
  roleIsSystem: boolean | null;
}) {
  return Boolean(
    staff.roleIsSystem && staff.roleName === SYSTEM_ADMIN_ROLE_NAME
  );
}
