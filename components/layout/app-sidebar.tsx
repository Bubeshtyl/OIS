"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Container,
  Droplet,
  LayoutDashboard,
  LogOut,
  SquareArrowDown,
  SquareArrowUp,
  User,
  type LucideIcon,
} from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { logoutAction } from "@/lib/auth/actions";
import { getNavItems, type NavIcon } from "@/lib/auth/rbac";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const iconMap: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  receive: SquareArrowDown,
  transfer: SquareArrowUp,
  sales: Droplet,
  reports: BarChart3,
  products: Container,
  users: User,
};

export function AppSidebar({
  role,
  name,
}: {
  role: UserRole;
  name: string;
}) {
  const pathname = usePathname();
  const items = getNavItems(role);
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4">
        <AppLogo
          variant="sidebar"
          href="/dashboard"
          onClick={closeMobileSidebar}
        />
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const Icon = iconMap[item.icon];
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      onClick={closeMobileSidebar}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                        active &&
                          "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
                      )}
                    >
                      <Icon className="size-[1.125rem] shrink-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto min-h-9 flex-col items-start gap-0.5 rounded-xl py-2 text-sidebar-foreground/60">
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
                Petrol Station
              </span>
              <span className="truncate text-xs group-data-[collapsible=icon]:hidden">
                {name}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logoutAction} className="w-full">
              <SidebarMenuButton
                type="submit"
                className="w-full rounded-lg text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                tooltip="Sign out"
              >
                <LogOut className="size-[1.125rem]" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Sign out
                </span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
