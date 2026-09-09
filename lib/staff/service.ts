import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";

export type StaffMember = {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  isPrime: boolean;
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
  isPrime: users.isPrime,
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
  isPrime: boolean;
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
    isPrime: row.isPrime,
    roleId: row.roleId,
    roleName: row.isPrime ? "Prime" : (row.roleName ?? null),
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
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isPlatformAdmin, false),
        eq(users.isPrime, false)
      )
    )
    .orderBy(users.name);

  return rows.map(toStaffMember);
}

/** id + name only — for shift-closing staff pickers. */
export async function listActiveStaffOptions(
  tenantId: string
): Promise<Array<{ id: string; name: string }>> {
  const db = getDb();
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isPlatformAdmin, false),
        eq(users.isActive, true)
      )
    )
    .orderBy(users.name);
}

/** Slim staff rows for Roles & Access — skips address/guardian columns. */
export async function listStaffForAccess(tenantId: string): Promise<StaffMember[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      isActive: users.isActive,
      isPrime: users.isPrime,
      roleId: users.roleId,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isPlatformAdmin, false),
        eq(users.isPrime, false)
      )
    )
    .orderBy(users.name);

  return rows.map((row) =>
    toStaffMember({
      ...row,
      roleName: row.roleName ?? null,
      joiningDate: null,
      primaryPhone: null,
      secondaryPhone: null,
      doorNo: null,
      street: null,
      area: null,
      townCity: null,
      district: null,
      pincode: null,
      aadharNumber: null,
      guardianName: null,
      guardianRelationship: null,
      guardianPhone: null,
    })
  );
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

export async function countActivePrimes(
  tenantId: string,
  exceptUserId?: string
): Promise<number> {
  const rows = await listActivePrimeUserIds(tenantId, exceptUserId);
  return rows.length;
}

/** @deprecated Use countActivePrimes */
export async function countActiveAdmins(
  tenantId: string,
  exceptUserId?: string
): Promise<number> {
  return countActivePrimes(tenantId, exceptUserId);
}

export async function listActivePrimeUserIds(
  tenantId: string,
  exceptUserId?: string
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true),
        eq(users.isPlatformAdmin, false),
        eq(users.isPrime, true)
      )
    );

  return rows
    .map((row) => row.id)
    .filter((id) => id !== exceptUserId);
}

/** @deprecated Use listActivePrimeUserIds */
export async function listActiveAdminUserIds(
  tenantId: string,
  exceptUserId?: string
): Promise<string[]> {
  return listActivePrimeUserIds(tenantId, exceptUserId);
}

export function isPrimeStaff(staff: { isPrime?: boolean | null }) {
  return Boolean(staff.isPrime);
}

/** @deprecated Use isPrimeStaff */
export function isAdminStaff(staff: {
  isPrime?: boolean | null;
  roleName?: string | null;
  roleIsSystem?: boolean | null;
}) {
  return isPrimeStaff(staff);
}
