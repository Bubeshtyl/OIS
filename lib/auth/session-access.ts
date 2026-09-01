import type { Permission } from "@/lib/auth/role-defaults";
import type { SessionData } from "@/lib/auth/session-config";

export function sessionHasCachedPermissions(
  session: SessionData
): session is SessionData & { permissions: Permission[] } {
  return Array.isArray(session.permissions);
}

export function hasCachedPermission(
  session: SessionData,
  permission: Permission
): boolean | null {
  if (session.isPlatformAdmin) return false;
  if (!sessionHasCachedPermissions(session)) return null;
  return session.permissions.includes(permission);
}

export function isSystemAdminFromSession(session: SessionData): boolean | null {
  if (session.isSystemAdmin === undefined) return null;
  return session.isSystemAdmin;
}

export function tenantAccessFromSession(session: SessionData): {
  onboardingComplete: boolean;
  isActive: boolean;
} | null {
  if (
    session.tenantOnboardingComplete === undefined ||
    session.tenantIsActive === undefined
  ) {
    return null;
  }
  return {
    onboardingComplete: session.tenantOnboardingComplete,
    isActive: session.tenantIsActive,
  };
}
