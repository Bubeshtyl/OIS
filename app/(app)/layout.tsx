import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  getTenantAccessState,
  isSystemAdminForSession,
} from "@/lib/auth/permissions";
import { getNavItems, hasPermission } from "@/lib/auth/rbac";
import { destroySession, getSession } from "@/lib/auth/session";
import { tenantAccessFromSession } from "@/lib/auth/session-access";
import { getPushNotificationStatus } from "@/lib/push/status";
import type { PushNotificationStatus } from "@/lib/push/status";
import { isPushConfigured } from "@/lib/push/vapid";
import { countPendingEditRequests } from "@/lib/shift-closing/ledger";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  if (session.tenantId && !session.isPlatformAdmin) {
    const cachedAccess = tenantAccessFromSession(session);
    const access =
      cachedAccess ?? (await getTenantAccessState(session.tenantId));
    if (!access.isActive) {
      await destroySession();
      redirect("/login");
    }
  }

  const navItems = await getNavItems(session);

  let initialPendingBadges = { rsp: 0, ledger: 0 };
  let isAdmin = false;
  let canUsePush = false;
  let initialPushStatus: PushNotificationStatus | null = null;

  if (session.tenantId && session.roleId && !session.isPlatformAdmin) {
    const [shiftClosingRead, adminRole] = await Promise.all([
      hasPermission(session, "shift-closing:read"),
      isSystemAdminForSession(session),
    ]);

    canUsePush = shiftClosingRead;
    isAdmin = adminRole;

    const followUps: Promise<void>[] = [];

    if (adminRole) {
      followUps.push(
        countPendingEditRequests(session.tenantId)
          .then((counts) => {
            initialPendingBadges = counts;
          })
          .catch((err) => {
            console.error("countPendingEditRequests error:", err);
          })
      );
    }

    if (shiftClosingRead && isPushConfigured()) {
      followUps.push(
        getPushNotificationStatus(session.tenantId, session.userId)
          .then((status) => {
            initialPushStatus = status;
          })
          .catch((err) => {
            console.error("getPushNotificationStatus error:", err);
          })
      );
    }

    if (followUps.length > 0) {
      await Promise.all(followUps);
    }
  }

  return (
    <AppShell
      session={session}
      navItems={navItems}
      initialPendingBadges={initialPendingBadges}
      isAdmin={isAdmin}
      canUsePush={canUsePush}
      initialPushStatus={initialPushStatus}
    >
      {children}
    </AppShell>
  );
}
