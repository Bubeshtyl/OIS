"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChartColumn,
  ChevronRight,
  Container,
  Droplet,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  SquareArrowDown,
  SquareArrowUp,
  Table2,
  Ticket,
  Upload,
  User,
  Users2,
  type LucideIcon,
} from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { logoutAction } from "@/lib/auth/actions";
import type { NavGroup, NavIcon, NavItem } from "@/lib/auth/rbac";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const iconMap: Record<NavIcon, LucideIcon> = {
  home: Home,
  dashboard: LayoutDashboard,
  receive: SquareArrowDown,
  transfer: SquareArrowUp,
  sales: Droplet,
  reports: BarChart3,
  "file-upload": Upload,
  "daily-sales": Table2,
  "sales-data-analytics": ChartColumn,
  products: Container,
  users: User,
  tickets: Ticket,
  teams: Users2,
  questions: ListChecks,
  settings: Settings,
  access: KeyRound,
};

const groupMeta: Record<
  NavGroup,
  { label: string; icon: NavIcon }
> = {
  analytics: { label: "Analytics", icon: "dashboard" },
  oil: { label: "Oil Management", icon: "sales" },
  tickets: { label: "Ticket Management", icon: "tickets" },
  configuration: { label: "Configuration", icon: "settings" },
};

function isItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

function CollapsibleNavGroup({
  label,
  icon,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  icon: NavIcon;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = iconMap[icon];
  const isActive = items.some((item) => isItemActive(pathname, item.href));
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={<SidebarMenuButton tooltip={label} className="h-10 rounded-xl" />}
        >
          <Icon className="size-[1.125rem]" />
          <span>{label}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((item) => {
              const SubIcon = iconMap[item.icon];
              const active = isItemActive(pathname, item.href);

              return (
                <SidebarMenuSubItem key={item.href}>
                  <SidebarMenuSubButton
                    isActive={active}
                    render={<Link href={item.href} onClick={onNavigate} />}
                  >
                    <SubIcon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname();
  const items = navItems;
  const topItems = items.filter((item) => !item.group);
  const analyticsItems = items.filter((item) => item.group === "analytics");
  const oilItems = items.filter((item) => item.group === "oil");
  const ticketItems = items.filter((item) => item.group === "tickets");
  const configItems = items.filter((item) => item.group === "configuration");
  const { isMobile, setOpenMobile } = useSidebar();

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  const groupedSections = (
    [
      { group: "analytics" as const, items: analyticsItems },
      { group: "oil" as const, items: oilItems },
      { group: "tickets" as const, items: ticketItems },
      { group: "configuration" as const, items: configItems },
    ] as const
  ).filter((section) => section.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-0 px-4 pt-5 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:pt-4">
        <Link
          href="/"
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
              {topItems.map((item) => {
                const Icon = iconMap[item.icon];
                const active = isItemActive(pathname, item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      className="h-10 rounded-xl"
                      render={
                        <Link href={item.href} onClick={closeMobileSidebar} />
                      }
                    >
                      <Icon className="size-[1.125rem]" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {groupedSections.map((section) => {
                const meta = groupMeta[section.group];
                return (
                  <CollapsibleNavGroup
                    key={section.group}
                    label={meta.label}
                    icon={meta.icon}
                    items={section.items}
                    pathname={pathname}
                    onNavigate={closeMobileSidebar}
                  />
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
