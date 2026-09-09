import {
  getPermissionsForRoleId,
  getTenantAccessState,
  isPrimeForSession,
} from "@/lib/auth/permissions";
import { sessionHasCachedPermissions } from "@/lib/auth/session-access";
import { ADMIN_PERMISSIONS } from "@/lib/auth/role-defaults";
import type { SessionData } from "@/lib/auth/session-config";

/** One-time DB fetch for sessions created before permissions were cached in the cookie. */
export async function hydrateSessionIfNeeded(
  session: SessionData
): Promise<SessionData> {
  if (
    !session.isLoggedIn ||
    (session.isPlatformAdmin && !session.isAssumingPrime) ||
    sessionHasCachedPermissions(session) ||
    !session.tenantId
  ) {
    return session;
  }

  if (session.isPrime || session.isAssumingPrime) {
    const [access, isPrime] = await Promise.all([
      getTenantAccessState(session.tenantId),
      session.isAssumingPrime
        ? Promise.resolve(true)
        : isPrimeForSession(session),
    ]);
    return {
      ...session,
      permissions: [...ADMIN_PERMISSIONS],
      tenantOnboardingComplete: access.onboardingComplete,
      tenantIsActive: access.isActive,
      isPrime: session.isAssumingPrime ? false : isPrime,
      isSystemAdmin: true,
    };
  }

  if (!session.roleId) {
    return session;
  }

  const [permissions, access, isPrime] = await Promise.all([
    getPermissionsForRoleId(session.roleId),
    getTenantAccessState(session.tenantId),
    isPrimeForSession(session),
  ]);

  return {
    ...session,
    permissions,
    tenantOnboardingComplete: access.onboardingComplete,
    tenantIsActive: access.isActive,
    isPrime,
    isSystemAdmin: isPrime,
  };
}
