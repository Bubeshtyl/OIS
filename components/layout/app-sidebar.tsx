"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChartColumn,
  ChevronRight,
  Clock,
  Container,
  Droplet,
  FileText,
  Gauge,
  Home,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Percent,
  Receipt,
  ScrollText,
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
import {
  pendingBadgeCountForHref,
  useShiftClosingPendingBadges,
} from "@/components/layout/use-shift-closing-pending-badges";
import { PushNotificationsToggle } from "@/components/layout/push-notifications-toggle";
import type { ShiftClosingPendingBadgeCounts } from "@/lib/shift-closing/ledger";
import type { NavGroup, NavIcon, NavItem } from "@/lib/auth/rbac";
import { Badge } from "@/components/ui/badge";
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
  "shift-closing": Clock,
  clock: Clock,
  ledger: ScrollText,
  "rsp-ledger": IndianRupee,
  gauge: Gauge,
  receive: SquareArrowDown,
  transfer: SquareArrowUp,
  sales: Droplet,
  reports: BarChart3,
  "file-upload": Upload,
  "daily-sales": Table2,
  "sales-data-analytics": ChartColumn,
  products: Container,
  "purchase-invoice": Receipt,
  "ms-hsd-receipts": Droplet,
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
  "shift-closing": { label: "Shift Closing", icon: "shift-closing" },
  analytics: { label: "Analytics", icon: "dashboard" },
  oil: { label: "Oil / Lubes", icon: "sales" },
  "invoice-purchase": { label: "Invoice Purchase", icon: "purchase-invoice" },
  taxation: { label: "Taxation", icon: "tds" },
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

function NavPendingBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Badge
      variant="destructive"
      className="ml-auto h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px] tabular-nums"
    >
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

function NavSubLink({
  item,
  pathname,
  onNavigate,
  className,
  pendingBadges,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  className?: string;
  pendingBadges: ShiftClosingPendingBadgeCounts;
}) {
  const SubIcon = iconMap[item.icon];
  const active = isItemActive(pathname, item.href);
  const badgeCount = pendingBadgeCountForHref(item.href, pendingBadges);

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={active}
        className={className}
        render={<Link href={item.href} onClick={onNavigate} />}
      >
        <SubIcon className="size-4" />
        <span className="min-w-0 truncate">{item.label}</span>
        <NavPendingBadge count={badgeCount} />
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function NestedCollapsibleSubgroup({
  parent,
  nestedItems,
  pathname,
  onNavigate,
  pendingBadges,
}: {
  parent: NavItem;
  nestedItems: NavItem[];
  pathname: string;
  onNavigate: () => void;
  pendingBadges: ShiftClosingPendingBadgeCounts;
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
              pendingBadges={pendingBadges}
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
  pendingBadges,
}: {
  label: string;
  icon: NavIcon;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
  pendingBadges: ShiftClosingPendingBadgeCounts;
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
                    pendingBadges={pendingBadges}
                  />
                );
              }

              return (
                <NavSubLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  pendingBadges={pendingBadges}
                />
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({
  navItems,
  initialPendingBadges = { rsp: 0, ledger: 0 },
  isAdmin = false,
}: {
  navItems: NavItem[];
  initialPendingBadges?: ShiftClosingPendingBadgeCounts;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const pendingBadges = useShiftClosingPendingBadges(initialPendingBadges);
  const items = navItems;
  const topItems = items.filter((item) => !item.group);
  const shiftClosingItems = items.filter(
    (item) => item.group === "shift-closing"
  );
  const analyticsItems = items.filter((item) => item.group === "analytics");
  const oilItems = items.filter((item) => item.group === "oil");
  const invoicePurchaseItems = items.filter(
    (item) => item.group === "invoice-purchase"
  );
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
      { group: "shift-closing" as const, items: shiftClosingItems },
      { group: "invoice-purchase" as const, items: invoicePurchaseItems },
      { group: "oil" as const, items: oilItems },
      { group: "analytics" as const, items: analyticsItems },
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
                    pendingBadges={pendingBadges}
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
            <PushNotificationsToggle isAdmin={isAdmin} />
          </SidebarMenuItem>
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
