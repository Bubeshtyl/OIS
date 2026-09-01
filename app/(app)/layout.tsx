import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getTenantAccessState, isSystemAdminRole } from "@/lib/auth/permissions";
import { getNavItems } from "@/lib/auth/rbac";
import { destroySession, getSession } from "@/lib/auth/session";
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
    const access = await getTenantAccessState(session.tenantId);
    if (!access.isActive) {
      await destroySession();
      redirect("/login");
    }
  }

  const navItems = await getNavItems(session);

  let initialPendingBadges = { rsp: 0, ledger: 0 };
  let isAdmin = false;
  if (
    session.tenantId &&
    session.roleId &&
    !session.isPlatformAdmin &&
    (await isSystemAdminRole(session.roleId))
  ) {
    isAdmin = true;
    initialPendingBadges = await countPendingEditRequests(session.tenantId);
  }

  return (
    <AppShell
      session={session}
      navItems={navItems}
      initialPendingBadges={initialPendingBadges}
      isAdmin={isAdmin}
    >
      {children}
    </AppShell>
  );
}
