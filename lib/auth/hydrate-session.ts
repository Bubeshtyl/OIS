import {
  getPermissionsForRoleId,
  getTenantAccessState,
  isSystemAdminRole,
} from "@/lib/auth/permissions";
import { sessionHasCachedPermissions } from "@/lib/auth/session-access";
import type { SessionData } from "@/lib/auth/session-config";

/** One-time DB fetch for sessions created before permissions were cached in the cookie. */
export async function hydrateSessionIfNeeded(
  session: SessionData
): Promise<SessionData> {
  if (
    !session.isLoggedIn ||
    session.isPlatformAdmin ||
    sessionHasCachedPermissions(session) ||
    !session.tenantId ||
    !session.roleId
  ) {
    return session;
  }

  const [permissions, access, isAdmin] = await Promise.all([
    getPermissionsForRoleId(session.roleId),
    getTenantAccessState(session.tenantId),
    isSystemAdminRole(session.roleId),
  ]);

  return {
    ...session,
    permissions,
    tenantOnboardingComplete: access.onboardingComplete,
    tenantIsActive: access.isActive,
    isSystemAdmin: isAdmin,
  };
}
