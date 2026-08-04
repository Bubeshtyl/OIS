import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getTenantAccessState } from "@/lib/auth/permissions";
import { getNavItems } from "@/lib/auth/rbac";
import { destroySession, getSession } from "@/lib/auth/session";

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

  return (
    <AppShell session={session} navItems={navItems}>
      {children}
    </AppShell>
  );
}
