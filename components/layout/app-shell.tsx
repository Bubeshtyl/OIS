import { AppSidebar } from "@/components/layout/app-sidebar";
import type { SessionData } from "@/lib/auth/session-config";
import type { ShiftClosingPendingBadgeCounts } from "@/lib/shift-closing/ledger";
import type { NavItem } from "@/lib/auth/rbac";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({
  session,
  navItems,
  initialPendingBadges,
  isAdmin,
  children,
}: {
  session: SessionData;
  navItems: NavItem[];
  initialPendingBadges?: ShiftClosingPendingBadgeCounts;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "15.5rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        navItems={navItems}
        initialPendingBadges={initialPendingBadges}
        isAdmin={isAdmin}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-8 md:pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
