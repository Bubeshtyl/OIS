import {
  getPermissionsForRoleId,
  getTenantAccessState,
  getTenantOnboardingComplete,
  sessionHasPermission,
} from "@/lib/auth/permissions";
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
  | "receive"
  | "transfer"
  | "sales"
  | "reports"
  | "file-upload"
  | "daily-sales"
  | "sales-data-analytics"
  | "products"
  | "users"
  | "tickets"
  | "teams"
  | "questions"
  | "settings"
  | "access"
  | "station"
  | "platform";

export type NavGroup = "analytics" | "oil" | "tickets" | "configuration";

export type NavCatalogItem = {
  href: string;
  label: string;
  icon: NavIcon;
  group?: NavGroup;
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
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    group: "oil",
    permission: "dashboard:read",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "reports",
    group: "oil",
    permission: "reports:read",
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
    href: "/receive",
    label: "Stock Received",
    icon: "receive",
    group: "oil",
    permission: "receive:write",
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
    href: "/admin/products",
    label: "Oil Products",
    icon: "products",
    group: "oil",
    permission: "products:manage",
    adminOnly: true,
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
  return sessionHasPermission(session, permission);
}

export async function canWriteInventory(session: SessionData): Promise<boolean> {
  return (
    (await hasPermission(session, "receive:write")) ||
    (await hasPermission(session, "transfer:write")) ||
    (await hasPermission(session, "sales:write"))
  );
}

export async function getDefaultPath(session: SessionData): Promise<string> {
  if (session.isPlatformAdmin) return "/platform";
  if (session.tenantId) {
    const complete = await getTenantOnboardingComplete(session.tenantId);
    if (!complete) return "/onboarding";
  }
  return "/";
}

export async function canAccessRoute(
  session: SessionData,
  pathname: string
): Promise<boolean> {
  if (session.isPlatformAdmin) {
    return (
      pathname === "/platform" ||
      pathname.startsWith("/platform/") ||
      pathname === "/login"
    );
  }

  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    return false;
  }

  if (session.tenantId) {
    const access = await getTenantAccessState(session.tenantId);
    if (!access.isActive) {
      return false;
    }

    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      if (!session.roleId) return false;
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

export async function getNavItems(session: SessionData): Promise<NavItem[]> {
  if (session.isPlatformAdmin) {
    return [
      {
        href: "/platform",
        label: "Tenants",
        icon: "platform",
      },
    ];
  }

  if (session.tenantId) {
    const complete = await getTenantOnboardingComplete(session.tenantId);
    if (!complete) return [];
  }

  const catalog = getNavCatalog();
  const permissions = await getPermissionsForRoleId(session.roleId);

  return catalog
    .filter(
      (item) => item.href === "/" || permissions.includes(item.permission)
    )
    .map(({ href, label, icon, group }) => ({ href, label, icon, group }));
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
