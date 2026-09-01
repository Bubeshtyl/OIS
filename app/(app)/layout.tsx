import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getTenantAccessState } from "@/lib/auth/permissions";
import { getNavItems, getNavItemsSync } from "@/lib/auth/rbac";
import { destroySession, getSession } from "@/lib/auth/session";
import {
  hasCachedPermission,
  isSystemAdminFromSession,
  tenantAccessFromSession,
} from "@/lib/auth/session-access";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const cachedAccess = tenantAccessFromSession(session);
  if (session.tenantId && !session.isPlatformAdmin) {
    if (cachedAccess && !cachedAccess.isActive) {
      await destroySession();
      redirect("/login");
    }
    if (!cachedAccess) {
      const access = await getTenantAccessState(session.tenantId);
      if (!access.isActive) {
        await destroySession();
        redirect("/login");
      }
    }
  }

  const navItems = getNavItemsSync(session) ?? (await getNavItems(session));

  const canUsePush =
    hasCachedPermission(session, "shift-closing:read") ?? false;
  const isAdmin = isSystemAdminFromSession(session) ?? false;

  return (
    <AppShell
      session={session}
      navItems={navItems}
      initialPendingBadges={{ rsp: 0, ledger: 0 }}
      isAdmin={isAdmin}
      canUsePush={canUsePush}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </AppShell>
  );
}
