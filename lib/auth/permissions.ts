import { cache } from "react";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rolePermissions, roles, tenants, users } from "@/lib/db/schema";
import {
  ADMIN_PERMISSIONS,
  SYSTEM_ADMIN_ROLE_NAME,
  type Permission,
} from "@/lib/auth/role-defaults";
import type { SessionData } from "@/lib/auth/session-config";
import { getSession, requireSession } from "@/lib/auth/session";
import {
  hasCachedPermission,
  isSystemAdminFromSession,
  tenantAccessFromSession,
} from "@/lib/auth/session-access";

export const getPermissionsForRoleId = cache(
  async (roleId: string | null | undefined): Promise<Permission[]> => {
    if (!roleId) return [];

    const db = getDb();
    const [role] = await db
      .select({
        id: roles.id,
        name: roles.name,
        isSystem: roles.isSystem,
      })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) return [];

    if (role.isSystem && role.name === SYSTEM_ADMIN_ROLE_NAME) {
      return [...ADMIN_PERMISSIONS];
    }

    const rows = await db
      .select({ permission: rolePermissions.permission })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    return rows.map((row) => row.permission as Permission);
  }
);

export const getPermissionsForRoleIds = cache(
  async (roleIds: string[]): Promise<Record<string, Permission[]>> => {
    const unique = [...new Set(roleIds.filter(Boolean))];
    if (unique.length === 0) return {};

    const db = getDb();
    const roleRows = await db
      .select({
        id: roles.id,
        name: roles.name,
        isSystem: roles.isSystem,
      })
      .from(roles)
      .where(inArray(roles.id, unique));

    const result: Record<string, Permission[]> = {};
    const needsPermQuery: string[] = [];

    for (const role of roleRows) {
      if (role.isSystem && role.name === SYSTEM_ADMIN_ROLE_NAME) {
        result[role.id] = [...ADMIN_PERMISSIONS];
      } else {
        needsPermQuery.push(role.id);
        result[role.id] = [];
      }
    }

    if (needsPermQuery.length > 0) {
      const rows = await db
        .select({
          roleId: rolePermissions.roleId,
          permission: rolePermissions.permission,
        })
        .from(rolePermissions)
        .where(inArray(rolePermissions.roleId, needsPermQuery));

      for (const row of rows) {
        result[row.roleId]?.push(row.permission as Permission);
      }
    }

    return result;
  }
);

export async function replaceRolePermissions(
  roleId: string,
  permissions: Permission[]
) {
  const db = getDb();
  const unique = [...new Set(permissions)];

  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (unique.length > 0) {
      await tx.insert(rolePermissions).values(
        unique.map((permission) => ({ roleId, permission }))
      );
    }
  });
}

export async function sessionHasPermission(
  session: SessionData,
  permission: Permission
): Promise<boolean> {
  if (session.isPlatformAdmin) return false;
  if (!session.roleId) return false;

  const cached = hasCachedPermission(session, permission);
  if (cached !== null) return cached;

  const permissions = await getPermissionsForRoleId(session.roleId);
  return permissions.includes(permission);
}

export type TenantSession = SessionData & {
  tenantId: string;
  roleId: string;
};

export async function requireTenantSession(): Promise<TenantSession> {
  const session = await requireSession();
  if (session.isPlatformAdmin || !session.tenantId || !session.roleId) {
    throw new Error("Unauthorized");
  }

  const cachedAccess = tenantAccessFromSession(session);
  if (cachedAccess) {
    if (!cachedAccess.isActive) {
      throw new Error("Unauthorized");
    }
    return session as TenantSession;
  }

  const access = await getTenantAccessState(session.tenantId);
  if (!access.isActive) {
    throw new Error("Unauthorized");
  }
  return session as TenantSession;
}

export async function requirePlatformAdmin(): Promise<SessionData> {
  const session = await requireSession();
  if (!session.isPlatformAdmin) {
    throw new Error("Unauthorized");
  }
  return session;
}

export const getTenantAccessState = cache(
  async (
    tenantId: string
  ): Promise<{
    onboardingComplete: boolean;
    isActive: boolean;
  }> => {
    const db = getDb();
    const [tenant] = await db
      .select({
        onboardingComplete: tenants.onboardingComplete,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return {
      onboardingComplete: tenant?.onboardingComplete ?? false,
      isActive: tenant?.isActive ?? false,
    };
  }
);

export async function getTenantOnboardingComplete(
  tenantId: string
): Promise<boolean> {
  const access = await getTenantAccessState(tenantId);
  return access.onboardingComplete;
}

export const isSystemAdminRole = cache(
  async (roleId: string | null | undefined): Promise<boolean> => {
    if (!roleId) return false;
    const db = getDb();
    const [role] = await db
      .select({ isSystem: roles.isSystem, name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    return Boolean(role?.isSystem && role.name === SYSTEM_ADMIN_ROLE_NAME);
  }
);

export async function isSystemAdminForSession(
  session: SessionData
): Promise<boolean> {
  const cached = isSystemAdminFromSession(session);
  if (cached !== null) return cached;
  return isSystemAdminRole(session.roleId);
}

/** All roles configured for a tenant, including the fixed system Admin role. */
export async function listRolesForTenant(tenantId: string) {
  const db = getDb();
  return db
    .select({ id: roles.id, name: roles.name, isSystem: roles.isSystem })
    .from(roles)
    .where(eq(roles.tenantId, tenantId))
    .orderBy(roles.name);
}

/** Finds (or lazily creates) a named role for a tenant, granting default
 * permissions only when the role is newly created. */
export async function ensureTenantRoleByName(
  tenantId: string,
  name: string,
  defaultPermissions: Permission[] = [],
  isSystem = false
): Promise<string> {
  const db = getDb();
  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.tenantId, tenantId), eq(roles.name, name)))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(roles)
    .values({ tenantId, name, isSystem })
    .returning({ id: roles.id });

  if (defaultPermissions.length > 0) {
    await db.insert(rolePermissions).values(
      defaultPermissions.map((permission) => ({
        roleId: created.id,
        permission,
      }))
    );
  }

  return created.id;
}

export async function createTenantRole(
  tenantId: string,
  name: string
): Promise<{ id: string; name: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Role name is required.");
  }
  if (trimmed.toLowerCase() === SYSTEM_ADMIN_ROLE_NAME.toLowerCase()) {
    throw new Error("Admin is a reserved role name.");
  }

  const db = getDb();
  try {
    const [created] = await db
      .insert(roles)
      .values({
        tenantId,
        name: trimmed,
        isSystem: false,
      })
      .returning({ id: roles.id, name: roles.name });
    return created;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("roles_tenant_name_unique") || message.includes("unique")) {
      throw new Error("A role with that name already exists.");
    }
    throw error;
  }
}

export async function deleteTenantRole(
  tenantId: string,
  roleId: string
): Promise<void> {
  const db = getDb();
  const [role] = await db
    .select({
      id: roles.id,
      isSystem: roles.isSystem,
      name: roles.name,
    })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
    .limit(1);

  if (!role) {
    throw new Error("Role not found.");
  }
  if (role.isSystem || role.name === SYSTEM_ADMIN_ROLE_NAME) {
    throw new Error("System roles cannot be deleted.");
  }

  const [assigned] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.roleId, roleId))
    .limit(1);

  if (assigned) {
    throw new Error("Reassign users before deleting this role.");
  }

  await db.delete(roles).where(eq(roles.id, roleId));
}

export async function assertTenantRole(
  tenantId: string,
  roleId: string
): Promise<boolean> {
  const db = getDb();
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)))
    .limit(1);
  return Boolean(role);
}

/** Soft check used by pages that return empty instead of throwing. */
export async function getOptionalTenantSession() {
  const session = await getSession();
  if (
    !session.isLoggedIn ||
    session.isPlatformAdmin ||
    !session.tenantId ||
    !session.roleId
  ) {
    return null;
  }
  return session as TenantSession;
}
