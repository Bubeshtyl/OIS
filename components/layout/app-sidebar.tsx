"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChartColumn,
  ChevronRight,
  Container,
  Droplet,
  FileText,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Percent,
  Receipt,
  Settings,
  SquareArrowDown,
  SquareArrowUp,
  Table2,
  Ticket,
  Upload,
  User,
  UserRound,
  Users,
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
  "purchase-invoice": Receipt,
  "lfr-invoice": FileText,
  tds: Percent,
  gst: Percent,
  staff: Users,
  customers: UserRound,
  users: User,
  tickets: Ticket,
  teams: Users2,
  questions: ListChecks,
  settings: Settings,
  access: KeyRound,
  station: MapPin,
  platform: Building2,
};

const groupMeta: Record<NavGroup, { label: string; icon: NavIcon }> = {
  analytics: { label: "Analytics", icon: "dashboard" },
  oil: { label: "Oil Management", icon: "sales" },
  taxation: { label: "Taxation", icon: "purchase-invoice" },
  staff: { label: "Staff Management", icon: "staff" },
  customers: { label: "Customer Management", icon: "customers" },
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

function NavSubLink({
  item,
  pathname,
  onNavigate,
  className,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  className?: string;
}) {
  const SubIcon = iconMap[item.icon];
  const active = isItemActive(pathname, item.href);

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={active}
        className={className}
        render={<Link href={item.href} onClick={onNavigate} />}
      >
        <SubIcon className="size-4" />
        <span>{item.label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function NestedCollapsibleSubgroup({
  parent,
  nestedItems,
  pathname,
  onNavigate,
}: {
  parent: NavItem;
  nestedItems: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  const SubIcon = iconMap[parent.icon];
  const parentActive = pathname === parent.href;
  const childActive = nestedItems.some((child) =>
    isItemActive(pathname, child.href)
  );
  const isActive = parentActive || childActive;
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/nested-collapsible"
    >
      <SidebarMenuSubItem>
        <div className="flex min-w-0 items-center gap-0.5">
          <SidebarMenuSubButton
            isActive={parentActive}
            className="min-w-0 flex-1"
            render={<Link href={parent.href} onClick={onNavigate} />}
          >
            <SubIcon className="size-4" />
            <span>{parent.label}</span>
          </SidebarMenuSubButton>
          <CollapsibleTrigger
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
            aria-label={`Toggle ${parent.label}`}
          >
            <ChevronRight className="size-4 transition-transform duration-200 group-data-open/nested-collapsible:rotate-90" />
          </CollapsibleTrigger>
        </div>
      </SidebarMenuSubItem>
      <CollapsibleContent>
        <ul className="mx-0 flex min-w-0 flex-col gap-1 border-l border-sidebar-border px-0 py-0.5 pl-2.5">
          {nestedItems.map((child) => (
            <NavSubLink
              key={child.href}
              item={child}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
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

  const topLevelItems = items.filter((item) => !item.subgroup);
  const childrenBySubgroup = items.reduce<Record<string, NavItem[]>>(
    (acc, item) => {
      if (!item.subgroup) return acc;
      (acc[item.subgroup] ??= []).push(item);
      return acc;
    },
    {}
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip={label} className="h-10 rounded-xl" />
          }
        >
          <Icon className="size-[1.125rem]" />
          <span>{label}</span>
          <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {topLevelItems.map((item) => {
              const nested = item.subgroupKey
                ? (childrenBySubgroup[item.subgroupKey] ?? [])
                : [];

              if (nested.length > 0) {
                return (
                  <NestedCollapsibleSubgroup
                    key={item.href}
                    parent={item}
                    nestedItems={nested}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                );
              }

              return (
                <NavSubLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
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
  const taxationItems = items.filter((item) => item.group === "taxation");
  const staffItems = items.filter((item) => item.group === "staff");
  const customerItems = items.filter((item) => item.group === "customers");
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
      { group: "taxation" as const, items: taxationItems },
      { group: "staff" as const, items: staffItems },
      { group: "customers" as const, items: customerItems },
      { group: "tickets" as const, items: ticketItems },
      { group: "configuration" as const, items: configItems },
    ] as const
  ).filter((section) => section.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-0 px-4 pt-5 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:pt-4">
        <Link href="/" onClick={closeMobileSidebar} className="outline-none">
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
