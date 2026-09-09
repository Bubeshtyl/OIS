import { cache } from "react";
import {
  getPermissionsForRoleId,
  getTenantAccessState,
  sessionHasPermission,
} from "@/lib/auth/permissions";
import {
  hasCachedPermission,
  isPrimeSession,
  sessionHasCachedPermissions,
  tenantAccessFromSession,
} from "@/lib/auth/session-access";
import {
  ADMIN_PERMISSIONS,
  type Permission,
} from "@/lib/auth/role-defaults";
import type { SessionData } from "@/lib/auth/session-config";

export type { Permission };
export { ADMIN_PERMISSIONS };

export type NavIcon =
  | "home"
  | "dashboard"
  | "shift-closing"
  | "clock"
  | "ledger"
  | "rsp-ledger"
  | "gauge"
  | "receive"
  | "transfer"
  | "sales"
  | "reports"
  | "file-upload"
  | "daily-sales"
  | "sales-data-analytics"
  | "products"
  | "purchase-invoice"
  | "ms-hsd-receipts"
  | "lfr-invoice"
  | "tds"
  | "gst"
  | "staff"
  | "customers"
  | "users"
  | "tickets"
  | "teams"
  | "questions"
  | "settings"
  | "access"
  | "station"
  | "platform";

export type NavGroup =
  | "shift-closing"
  | "analytics"
  | "oil"
  | "invoice-purchase"
  | "taxation"
  | "staff"
  | "customers"
  | "tickets"
  | "configuration";

export type NavCatalogItem = {
  href: string;
  label: string;
  icon: NavIcon;
  group?: NavGroup;
  /** Nest this item under the parent that has matching `subgroupKey`. */
  subgroup?: string;
  /** Children with `subgroup` equal to this key render under this item. */
  subgroupKey?: string;
  permission: Permission;
  adminOnly?: boolean;
};

const BASE_NAV_CATALOG: NavCatalogItem[] = [
  {
    href: "/",
    label: "Home",
    icon: "home",
    permission: "dashboard:read",
  },
  {
    href: "/shift-closing/rsp",
    label: "RSP Ledger",
    icon: "rsp-ledger",
    group: "shift-closing",
    permission: "shift-closing:read",
  },
  {
    href: "/shift-closing/ledger",
    label: "Ledger",
    icon: "ledger",
    group: "shift-closing",
    permission: "shift-closing:read",
  },
  {
    href: "/shift-closing/6am",
    label: "6AM",
    icon: "clock",
    group: "shift-closing",
    permission: "shift-closing:read",
  },
  {
    href: "/shift-closing/interim",
    label: "Interim",
    icon: "gauge",
    group: "shift-closing",
    permission: "shift-closing:read",
  },
  {
    href: "/shift-closing/upcoming",
    label: "Upcoming",
    icon: "gauge",
    group: "shift-closing",
    permission: "shift-closing:read",
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    group: "oil",
    permission: "dashboard:read",
  },

  {
    href: "/admin/products",
    label: "Add Oil / Lubes",
    icon: "products",
    group: "oil",
    permission: "products:manage",
    adminOnly: true,
  },
  {
    href: "/transfer",
    label: "Stock Issued",
    icon: "transfer",
    group: "oil",
    permission: "transfer:write",
  },
  {
    href: "/sales",
    label: "Daily Consumption",
    icon: "sales",
    group: "oil",
    permission: "sales:write",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "reports",
    group: "oil",
    permission: "reports:read",
  },
  {
    href: "/invoice-purchase/ms-hsd-receipts",
    label: "MS / HSD Receipts",
    icon: "ms-hsd-receipts",
    group: "invoice-purchase",
    permission: "receive:write",
  },
  {
    href: "/receive",
    label: "Oil / Lube Receipts",
    icon: "receive",
    group: "invoice-purchase",
    permission: "receive:write",
  },
  {
    href: "/invoice-purchase/lfr-receipts",
    label: "LFR Receipts",
    icon: "lfr-invoice",
    group: "invoice-purchase",
    permission: "taxation:read",
  },
  {
    href: "/file-upload",
    label: "File Upload",
    icon: "file-upload",
    group: "analytics",
    permission: "file-upload:read",
  },
  {
    href: "/daily-sales-report",
    label: "Daily Sales Data",
    icon: "daily-sales",
    group: "analytics",
    permission: "daily-sales:read",
  },
  {
    href: "/sales-data-analytics",
    label: "Sales Data Analytics",
    icon: "sales-data-analytics",
    group: "analytics",
    permission: "sales-data-analytics:read",
  },
  {
    href: "/taxation/tds",
    label: "TDS",
    icon: "tds",
    group: "taxation",
    permission: "taxation:read",
  },
  {
    href: "/taxation/gst",
    label: "GST",
    icon: "gst",
    group: "taxation",
    permission: "taxation:read",
  },
  {
    href: "/staff",
    label: "Staff",
    icon: "staff",
    group: "staff",
    permission: "staff:read",
  },
  {
    href: "/customers",
    label: "Customers",
    icon: "customers",
    group: "customers",
    permission: "customers:read",
  },
  {
    href: "/tickets",
    label: "Tickets",
    icon: "tickets",
    group: "tickets",
    permission: "tickets:read",
  },
  {
    href: "/admin/questions",
    label: "Questionnaire",
    icon: "questions",
    group: "tickets",
    permission: "questions:manage",
    adminOnly: true,
  },
  {
    href: "/admin/settings",
    label: "Ticket Settings",
    icon: "settings",
    group: "tickets",
    permission: "settings:manage",
    adminOnly: true,
  },
  {
    href: "/admin/teams",
    label: "Teams",
    icon: "teams",
    group: "configuration",
    permission: "teams:manage",
    adminOnly: true,
  },
  {
    href: "/admin/access",
    label: "Roles & Access",
    icon: "access",
    group: "configuration",
    permission: "users:manage",
    adminOnly: true,
  },
  {
    href: "/admin/station",
    label: "Station",
    icon: "station",
    group: "configuration",
    permission: "users:manage",
    adminOnly: true,
  },
];

export function getNavCatalog(): NavCatalogItem[] {
  return BASE_NAV_CATALOG;
}

export function getGrantableNavCatalog(): NavCatalogItem[] {
  return getNavCatalog().filter(
    (item) => !item.adminOnly && item.href !== "/"
  );
}

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  group?: NavGroup;
  subgroup?: string;
  subgroupKey?: string;
};

const EXTRA_ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
  "/dashboard": "dashboard:read",
  "/stock-count": "dashboard:read",
  "/admin/users": "users:manage",
  "/tickets/new": "tickets:manage",
};

function buildRoutePermissions(): Record<string, Permission | Permission[]> {
  const routes: Record<string, Permission | Permission[]> = {
    ...EXTRA_ROUTE_PERMISSIONS,
  };
  for (const item of getNavCatalog()) {
    routes[item.href] = item.permission;
  }
  return routes;
}

export async function hasPermission(
  session: SessionData,
  permission: Permission
): Promise<boolean> {
  const cached = hasCachedPermission(session, permission);
  if (cached !== null) return cached;
  return sessionHasPermission(session, permission);
}

function resolveTenantAccess(session: SessionData) {
  const cached = tenantAccessFromSession(session);
  if (cached) return Promise.resolve(cached);
  if (!session.tenantId) return Promise.resolve(null);
  return getTenantAccessState(session.tenantId);
}

export function getDefaultPathSync(session: SessionData): string | null {
  if (session.isPlatformAdmin && !session.isAssumingPrime) return "/platform";
  const access = tenantAccessFromSession(session);
  if (access) {
    return access.onboardingComplete ? "/" : "/onboarding";
  }
  return null;
}

export async function getDefaultPath(session: SessionData): Promise<string> {
  const cached = getDefaultPathSync(session);
  if (cached) return cached;
  if (session.tenantId) {
    const access = await getTenantAccessState(session.tenantId);
    if (!access.onboardingComplete) return "/onboarding";
  }
  return "/";
}

export function canAccessRouteSync(
  session: SessionData,
  pathname: string
): boolean | null {
  if (session.isPlatformAdmin && !session.isAssumingPrime) {
    return (
      pathname === "/platform" ||
      pathname.startsWith("/platform/") ||
      pathname === "/login"
    );
  }

  // Assuming superuser may return to platform; real tenants may not.
  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    return Boolean(session.isAssumingPrime);
  }

  const access = tenantAccessFromSession(session);
  const prime = isPrimeSession(session);
  if (session.tenantId) {
    if (access?.isActive === false) return false;
    if (!access) return null;

    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      if (!prime && !session.roleId) return false;
      return !access.onboardingComplete;
    }

    if (!access.onboardingComplete) return false;
  } else if (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  ) {
    return false;
  }

  if (pathname === "/") return true;
  if (prime) return true;
  if (!sessionHasCachedPermissions(session)) return null;

  const routePermissions = buildRoutePermissions();
  const routes = Object.keys(routePermissions).sort(
    (a, b) => b.length - a.length
  );

  for (const route of routes) {
    const matches =
      route === "/"
        ? pathname === "/"
        : pathname === route || pathname.startsWith(`${route}/`);

    if (matches) {
      const permission = routePermissions[route];
      const perms = Array.isArray(permission) ? permission : [permission];
      return perms.some((p) => session.permissions.includes(p));
    }
  }

  return true;
}

export function getNavItemsSync(session: SessionData): NavItem[] | null {
  if (session.isPlatformAdmin && !session.isAssumingPrime) {
    return [
      {
        href: "/platform",
        label: "Tenants",
        icon: "platform",
      },
    ];
  }

  const access = tenantAccessFromSession(session);
  if (session.tenantId && access && !access.onboardingComplete) {
    return [];
  }

  if (isPrimeSession(session)) {
    const catalog = getNavCatalog();
    return catalog.map(
      ({ href, label, icon, group, subgroup, subgroupKey }) => ({
        href,
        label,
        icon,
        group,
        subgroup,
        subgroupKey,
      })
    );
  }

  if (!sessionHasCachedPermissions(session)) {
    return null;
  }

  const catalog = getNavCatalog();
  return catalog
    .filter(
      (item) => item.href === "/" || session.permissions.includes(item.permission)
    )
    .map(({ href, label, icon, group, subgroup, subgroupKey }) => ({
      href,
      label,
      icon,
      group,
      subgroup,
      subgroupKey,
    }));
}

export async function canAccessRoute(
  session: SessionData,
  pathname: string
): Promise<boolean> {
  const cached = canAccessRouteSync(session, pathname);
  if (cached !== null) return cached;

  if (session.isPlatformAdmin && !session.isAssumingPrime) {
    return (
      pathname === "/platform" ||
      pathname.startsWith("/platform/") ||
      pathname === "/login"
    );
  }

  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    return Boolean(session.isAssumingPrime);
  }

  if (session.tenantId) {
    const access = await getTenantAccessState(session.tenantId);
    if (!access.isActive) {
      return false;
    }

    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      if (!isPrimeSession(session) && !session.roleId) return false;
      return !access.onboardingComplete;
    }

    if (!access.onboardingComplete) {
      return false;
    }
  } else if (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  ) {
    return false;
  }

  if (pathname === "/") return true;
  if (isPrimeSession(session)) return true;

  const routePermissions = buildRoutePermissions();
  const routes = Object.keys(routePermissions).sort(
    (a, b) => b.length - a.length
  );

  for (const route of routes) {
    const matches =
      route === "/"
        ? pathname === "/"
        : pathname === route || pathname.startsWith(`${route}/`);

    if (matches) {
      const permission = routePermissions[route];
      const perms = Array.isArray(permission) ? permission : [permission];
      for (const p of perms) {
        if (await hasPermission(session, p)) return true;
      }
      return false;
    }
  }
  return true;
}

export const getNavItems = cache(async (session: SessionData): Promise<NavItem[]> => {
  if (session.isPlatformAdmin && !session.isAssumingPrime) {
    return [
      {
        href: "/platform",
        label: "Tenants",
        icon: "platform",
      },
    ];
  }

  const access = await resolveTenantAccess(session);
  if (session.tenantId && access && !access.onboardingComplete) {
    return [];
  }

  const catalog = getNavCatalog();
  if (isPrimeSession(session)) {
    return catalog.map(
      ({ href, label, icon, group, subgroup, subgroupKey }) => ({
        href,
        label,
        icon,
        group,
        subgroup,
        subgroupKey,
      })
    );
  }

  const permissions = sessionHasCachedPermissions(session)
    ? session.permissions
    : await getPermissionsForRoleId(session.roleId);

  return catalog
    .filter(
      (item) => item.href === "/" || permissions.includes(item.permission)
    )
    .map(({ href, label, icon, group, subgroup, subgroupKey }) => ({
      href,
      label,
      icon,
      group,
      subgroup,
      subgroupKey,
    }));
});

export async function canWriteInventory(session: SessionData): Promise<boolean> {
  return (
    (await hasPermission(session, "receive:write")) ||
    (await hasPermission(session, "transfer:write")) ||
    (await hasPermission(session, "sales:write"))
  );
}

/** Permissions to persist when a grantable catalog route is enabled. */
export function permissionsGrantedByNavItem(
  item: NavCatalogItem
): Permission[] {
  // Tickets list alone isn't enough for creating tickets — grant manage with read.
  if (item.href === "/tickets") {
    return ["tickets:read", "tickets:manage"];
  }
  return [item.permission];
}
