import bcrypt from "bcryptjs";
import { and, asc, count, eq, max, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  dailySalesUploads,
  rolePermissions,
  roles,
  tenants,
  ticketSettings,
  users,
} from "@/lib/db/schema";
import {
  ADMIN_PERMISSIONS,
  SYSTEM_ADMIN_ROLE_NAME,
} from "@/lib/auth/role-defaults";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Station names may duplicate; slug must stay unique for billing identity. */
async function allocateUniqueSlug(base: string) {
  const db = getDb();
  const root = slugify(base) || "station";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [existing] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export type StationProfileInput = {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
};

export async function listTenants() {
  const db = getDb();
  return db.select().from(tenants).orderBy(asc(tenants.name));
}

export type TenantHealthRow = {
  id: string;
  slug: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  onboardingComplete: boolean;
  isActive: boolean;
  createdAt: Date;
  userCount: number;
  lastLoginAt: Date | null;
  lastUploadAt: Date | null;
  adminUsername: string | null;
};

export async function listTenantsWithHealth(): Promise<TenantHealthRow[]> {
  const db = getDb();

  const userStats = db
    .select({
      tenantId: users.tenantId,
      userCount: count(users.id).as("user_count"),
      lastLoginAt: max(users.lastLoginAt).as("last_login_at"),
    })
    .from(users)
    .where(eq(users.isPlatformAdmin, false))
    .groupBy(users.tenantId)
    .as("user_stats");

  const uploadStats = db
    .select({
      tenantId: dailySalesUploads.tenantId,
      lastUploadAt: max(dailySalesUploads.createdAt).as("last_upload_at"),
    })
    .from(dailySalesUploads)
    .groupBy(dailySalesUploads.tenantId)
    .as("upload_stats");

  const rows = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      name: tenants.name,
      addressLine1: tenants.addressLine1,
      addressLine2: tenants.addressLine2,
      city: tenants.city,
      state: tenants.state,
      pincode: tenants.pincode,
      phone: tenants.phone,
      onboardingComplete: tenants.onboardingComplete,
      isActive: tenants.isActive,
      createdAt: tenants.createdAt,
      userCount: sql<number>`coalesce(${userStats.userCount}, 0)`.mapWith(Number),
      lastLoginAt: userStats.lastLoginAt,
      lastUploadAt: uploadStats.lastUploadAt,
      adminUsername: sql<string | null>`(
        SELECT u.username
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.tenant_id = ${tenants.id}
          AND r.name = ${SYSTEM_ADMIN_ROLE_NAME}
          AND r.is_system = true
          AND u.is_platform_admin = false
        ORDER BY u.created_at ASC
        LIMIT 1
      )`,
    })
    .from(tenants)
    .leftJoin(userStats, eq(userStats.tenantId, tenants.id))
    .leftJoin(uploadStats, eq(uploadStats.tenantId, tenants.id))
    .orderBy(asc(tenants.name));

  return rows;
}

export async function setTenantActive(tenantId: string, isActive: boolean) {
  const db = getDb();
  const [updated] = await db
    .update(tenants)
    .set({ isActive })
    .where(eq(tenants.id, tenantId))
    .returning({ id: tenants.id, name: tenants.name, isActive: tenants.isActive });
  if (!updated) {
    throw new Error("Station not found.");
  }
  return updated;
}

export async function getTenantAdminUser(tenantId: string) {
  const db = getDb();
  const [admin] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(roles.name, SYSTEM_ADMIN_ROLE_NAME),
        eq(roles.isSystem, true),
        eq(users.isPlatformAdmin, false)
      )
    )
    .orderBy(asc(users.createdAt))
    .limit(1);
  return admin ?? null;
}

export async function resetTenantAdminPassword(
  tenantId: string,
  newPassword: string
) {
  const admin = await getTenantAdminUser(tenantId);
  if (!admin) {
    throw new Error("No Admin user found for this station.");
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const db = getDb();
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, admin.id));
  return admin;
}

export async function isTenantActive(tenantId: string): Promise<boolean> {
  const db = getDb();
  const [tenant] = await db
    .select({ isActive: tenants.isActive })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return tenant?.isActive ?? false;
}

export async function createTenantWithAdmin(input: {
  name: string;
  slug?: string;
  adminName: string;
  adminUsername: string;
  adminPassword: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}) {
  const db = getDb();
  const requestedSlug = input.slug?.trim();
  let slug: string;
  if (requestedSlug) {
    const normalized = slugify(requestedSlug);
    if (!normalized) {
      throw new Error("A valid slug is required.");
    }
    const [taken] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, normalized))
      .limit(1);
    if (taken) {
      throw new Error("That station slug is already taken.");
    }
    slug = normalized;
  } else {
    // Names may repeat across stations; auto-suffix the slug when needed.
    slug = await allocateUniqueSlug(input.name);
  }

  const username = input.adminUsername.trim().toLowerCase();
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existingUser) {
    throw new Error("That username is already taken.");
  }

  const passwordHash = await bcrypt.hash(input.adminPassword, 10);

  return db.transaction(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({
        slug,
        name: input.name.trim(),
        addressLine1: input.addressLine1?.trim() || null,
        addressLine2: input.addressLine2?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        pincode: input.pincode?.trim() || null,
        phone: input.phone?.trim() || null,
        onboardingComplete: false,
        isActive: true,
      })
      .returning();

    const [adminRole] = await tx
      .insert(roles)
      .values({
        tenantId: tenant.id,
        name: SYSTEM_ADMIN_ROLE_NAME,
        isSystem: true,
      })
      .returning();

    await tx.insert(rolePermissions).values(
      ADMIN_PERMISSIONS.map((permission) => ({
        roleId: adminRole.id,
        permission,
      }))
    );

    await tx.insert(ticketSettings).values({
      tenantId: tenant.id,
      prefix: "JCK",
      paddingWidth: 6,
    });

    const [adminUser] = await tx
      .insert(users)
      .values({
        tenantId: tenant.id,
        roleId: adminRole.id,
        name: input.adminName.trim(),
        username,
        passwordHash,
        isPlatformAdmin: false,
        isActive: true,
      })
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
      });

    return { tenant, adminRole, adminUser };
  });
}

export async function updateStationProfile(
  tenantId: string,
  input: StationProfileInput,
  options?: { markOnboardingComplete?: boolean; slug?: string }
) {
  const db = getDb();

  let slug: string | undefined;
  if (options?.slug !== undefined) {
    const normalized = slugify(options.slug);
    if (!normalized) {
      throw new Error("A valid slug is required.");
    }
    const [taken] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, normalized))
      .limit(1);
    if (taken && taken.id !== tenantId) {
      throw new Error("That station slug is already taken.");
    }
    slug = normalized;
  }

  await db
    .update(tenants)
    .set({
      name: input.name.trim(),
      addressLine1: input.addressLine1.trim(),
      addressLine2: input.addressLine2?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      phone: input.phone?.trim() || null,
      ...(slug ? { slug } : {}),
      ...(options?.markOnboardingComplete
        ? { onboardingComplete: true }
        : {}),
    })
    .where(eq(tenants.id, tenantId));
}

export async function completeTenantOnboarding(
  tenantId: string,
  input: StationProfileInput
) {
  await updateStationProfile(tenantId, input, {
    markOnboardingComplete: true,
  });
}

export async function getTenantById(tenantId: string) {
  const db = getDb();
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return tenant ?? null;
}

/**
 * The Telegram bot is a single global webhook with no per-request session,
 * so it operates against the earliest-created tenant until multi-bot support
 * exists.
 */
export async function getDefaultTenantId(): Promise<string> {
  const db = getDb();
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .orderBy(asc(tenants.createdAt))
    .limit(1);
  if (!tenant) {
    throw new Error("No tenant is configured yet.");
  }
  return tenant.id;
}
