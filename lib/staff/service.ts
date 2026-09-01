import { and, eq, sql } from "drizzle-orm";
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
  joiningDate: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  doorNo: string | null;
  street: string | null;
  area: string | null;
  townCity: string | null;
  district: string | null;
  pincode: string | null;
  aadharNumber: string | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianPhone: string | null;
};

const staffColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  isActive: users.isActive,
  roleId: users.roleId,
  roleName: roles.name,
  joiningDate: users.joiningDate,
  primaryPhone: users.primaryPhone,
  secondaryPhone: users.secondaryPhone,
  doorNo: users.doorNo,
  street: users.street,
  area: users.area,
  townCity: users.townCity,
  district: users.district,
  pincode: users.pincode,
  aadharNumber: users.aadharNumber,
  guardianName: users.guardianName,
  guardianRelationship: users.guardianRelationship,
  guardianPhone: users.guardianPhone,
} as const;

let staffProfileColumnsReady: Promise<void> | null = null;

/** Preview/prod may deploy before `db:migrate` is run. These ALTERs are idempotent. */
export async function ensureStaffProfileColumns() {
  if (!staffProfileColumnsReady) {
    staffProfileColumnsReady = (async () => {
      const db = getDb();
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date date`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_phone text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_phone text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS door_no text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS street text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS area text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS town_city text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS district text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhar_number text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS guardian_name text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS guardian_relationship text`
      );
      await db.execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS guardian_phone text`
      );
    })().catch((error) => {
      staffProfileColumnsReady = null;
      throw error;
    });
  }

  await staffProfileColumnsReady;
}

function toStaffMember(row: {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  roleId: string | null;
  roleName: string | null;
  joiningDate: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  doorNo: string | null;
  street: string | null;
  area: string | null;
  townCity: string | null;
  district: string | null;
  pincode: string | null;
  aadharNumber: string | null;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianPhone: string | null;
}): StaffMember {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    isActive: row.isActive,
    roleId: row.roleId,
    roleName: row.roleName ?? null,
    joiningDate: row.joiningDate,
    primaryPhone: row.primaryPhone,
    secondaryPhone: row.secondaryPhone,
    doorNo: row.doorNo,
    street: row.street,
    area: row.area,
    townCity: row.townCity,
    district: row.district,
    pincode: row.pincode,
    aadharNumber: row.aadharNumber,
    guardianName: row.guardianName,
    guardianRelationship: row.guardianRelationship,
    guardianPhone: row.guardianPhone,
  };
}

export async function listStaff(tenantId: string): Promise<StaffMember[]> {
  const db = getDb();
  const rows = await db
    .select(staffColumns)
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.tenantId, tenantId), eq(users.isPlatformAdmin, false)))
    .orderBy(users.name);

  return rows.map(toStaffMember);
}

export async function getStaffById(tenantId: string, staffId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      ...staffColumns,
      tenantId: users.tenantId,
      isPlatformAdmin: users.isPlatformAdmin,
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
  const rows = await listActiveAdminUserIds(tenantId, exceptUserId);
  return rows.length;
}

export async function listActiveAdminUserIds(
  tenantId: string,
  exceptUserId?: string
): Promise<string[]> {
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

  return rows
    .map((row) => row.id)
    .filter((id) => id !== exceptUserId);
}

export function isAdminStaff(staff: {
  roleName: string | null;
  roleIsSystem: boolean | null;
}) {
  return Boolean(
    staff.roleIsSystem && staff.roleName === SYSTEM_ADMIN_ROLE_NAME
  );
}
