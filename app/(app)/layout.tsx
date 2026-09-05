import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getTenantAccessState } from "@/lib/auth/permissions";
import { getNavItems, getNavItemsSync } from "@/lib/auth/rbac";
import { destroySession, getSession } from "@/lib/auth/session";
import {
  hasCachedPermission,
  isSystemAdminFromSession,
  tenantAccessFromSession,
} from "@/lib/auth/session-access";

/** Paints immediately so FCP is not gated on session/cookie work. */
function AppShellFallback() {
  return (
    <div className="flex min-h-svh w-full">
      <aside className="hidden w-[15.5rem] shrink-0 border-r bg-muted/30 md:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <span className="text-sm font-medium text-muted-foreground">TYL</span>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-8 md:pt-0">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

async function AuthenticatedAppShell({
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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
    </Suspense>
  );
}
