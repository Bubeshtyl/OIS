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

function SidebarDivider() {
  return (
    <div className="px-4 py-3 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-2.5">
      <div
        role="separator"
        aria-orientation="horizontal"
        className="h-px w-full bg-sidebar-border/70"
      />
    </div>
  );
}

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = getNavItems(role);
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-0 px-4 pt-5 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:pt-4">
        <Link
          href="/dashboard"
          onClick={closeMobileSidebar}
          className="outline-none"
        >
          <AppLogo variant="sidebar" />
        </Link>
      </SidebarHeader>

      <SidebarDivider />

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
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      className="h-10 rounded-xl"
                      render={
                        <Link
                          href={item.href}
                          onClick={closeMobileSidebar}
                        />
                      }
                    >
                      <Icon className="size-[1.125rem]" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarDivider />

      <SidebarFooter className="p-0 px-3 pb-5 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logoutAction} className="w-full">
              <SidebarMenuButton
                type="submit"
                tooltip="Sign out"
                className="h-10 rounded-xl"
              >
                <LogOut className="size-[1.125rem]" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
