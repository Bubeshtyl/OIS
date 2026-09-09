import type { Permission } from "@/lib/auth/role-defaults";
import type { SessionData } from "@/lib/auth/session-config";

export function sessionHasCachedPermissions(
  session: SessionData
): session is SessionData & { permissions: Permission[] } {
  return Array.isArray(session.permissions);
}

/** Effective Prime: real Prime user or superuser assuming Prime. */
export function isPrimeSession(session: SessionData): boolean {
  return Boolean(session.isPrime || session.isAssumingPrime);
}

export function hasCachedPermission(
  session: SessionData,
  permission: Permission
): boolean | null {
  if (isPrimeSession(session)) return true;
  if (session.isPlatformAdmin && !session.isAssumingPrime) return false;
  if (!sessionHasCachedPermissions(session)) return null;
  return session.permissions.includes(permission);
}

/** @deprecated Use isPrimeSession / isPrimeFromSession. */
export function isSystemAdminFromSession(session: SessionData): boolean | null {
  if (session.isPrime !== undefined || session.isAssumingPrime !== undefined) {
    return isPrimeSession(session);
  }
  if (session.isSystemAdmin === undefined) return null;
  return session.isSystemAdmin;
}

export function isPrimeFromSession(session: SessionData): boolean | null {
  if (session.isPrime === undefined && session.isAssumingPrime === undefined) {
    if (session.isSystemAdmin === undefined) return null;
    return session.isSystemAdmin;
  }
  return isPrimeSession(session);
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
