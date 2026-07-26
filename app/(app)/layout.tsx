import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getNavItems } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const navItems = await getNavItems(session.role);

  return (
    <AppShell session={session} navItems={navItems}>
      {children}
    </AppShell>
  );
}
