import type { UserRole } from "@/lib/db/schema";
import { isRbacAccessUiEnabled } from "@/lib/features";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/auth/role-defaults";

export type { Permission };
export { DEFAULT_ROLE_PERMISSIONS };

export type NavIcon =
  | "dashboard"
  | "receive"
  | "transfer"
  | "sales"
  | "reports"
  | "products"
  | "users"
  | "tickets"
  | "teams"
  | "questions"
  | "settings"
  | "access";

export type NavGroup = "oil" | "tickets" | "configuration";

export type NavCatalogItem = {
  href: string;
  label: string;
  icon: NavIcon;
  group?: NavGroup;
  /** Permission required to see this nav item / access this route. */
  permission: Permission;
  /** Admin-only routes — not grantable to Manager/Accounts in the Access UI. */
  adminOnly?: boolean;
  /**
   * Extra permissions written when this route is enabled for a role
   * (e.g. Tickets also grants tickets:manage for managers).
   */
  extraGrants?: Partial<Record<"MANAGER" | "ACCOUNTS", Permission[]>>;
};

const BASE_NAV_CATALOG: NavCatalogItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    permission: "dashboard:read",
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
    href: "/reports",
    label: "Reports",
    icon: "reports",
    group: "oil",
    permission: "reports:read",
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
    extraGrants: { MANAGER: ["tickets:manage"] },
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
];

const ACCESS_NAV_ITEM: NavCatalogItem = {
  href: "/admin/access",
  label: "Access",
  icon: "access",
  group: "configuration",
  permission: "users:manage",
  adminOnly: true,
};

/** Full sidebar catalog. Access appears only when the feature flag is on. */
export function getNavCatalog(): NavCatalogItem[] {
  if (isRbacAccessUiEnabled()) {
    return [...BASE_NAV_CATALOG, ACCESS_NAV_ITEM];
  }
  return BASE_NAV_CATALOG;
}

/** Routes grantable to Manager/Accounts in the Access UI. */
export function getGrantableNavCatalog(): NavCatalogItem[] {
  return getNavCatalog().filter((item) => !item.adminOnly);
}

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  group?: NavGroup;
};

const EXTRA_ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
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
  role: UserRole,
  permission: Permission
): Promise<boolean> {
  if (role === "ADMIN") {
    return DEFAULT_ROLE_PERMISSIONS.ADMIN.includes(permission);
  }

  const permissions = await getPermissionsForRole(role);
  return permissions.includes(permission);
}

export async function canWriteInventory(role: UserRole): Promise<boolean> {
  return (
    (await hasPermission(role, "receive:write")) ||
    (await hasPermission(role, "transfer:write")) ||
    (await hasPermission(role, "sales:write"))
  );
}

export function getDefaultPath(role: UserRole): string {
  return role === "ACCOUNTS" ? "/reports" : "/dashboard";
}

export async function canAccessRoute(
  role: UserRole,
  pathname: string
): Promise<boolean> {
  if (pathname === "/admin/access" || pathname.startsWith("/admin/access/")) {
    if (!isRbacAccessUiEnabled()) return false;
  }

  const routePermissions = buildRoutePermissions();

  // Longer prefixes first so /tickets/new matches before /tickets
  const routes = Object.keys(routePermissions).sort(
    (a, b) => b.length - a.length
  );

  for (const route of routes) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const permission = routePermissions[route];
      const perms = Array.isArray(permission) ? permission : [permission];
      for (const p of perms) {
        if (await hasPermission(role, p)) return true;
      }
      return false;
    }
  }
  return true;
}

export async function getNavItems(role: UserRole): Promise<NavItem[]> {
  const catalog = getNavCatalog();
  const permissions = await getPermissionsForRole(role);

  return catalog
    .filter((item) => permissions.includes(item.permission))
    .map(({ href, label, icon, group }) => ({ href, label, icon, group }));
}

/** Permissions to persist when a grantable catalog route is enabled for a role. */
export function permissionsGrantedByNavItem(
  item: NavCatalogItem,
  role: "MANAGER" | "ACCOUNTS"
): Permission[] {
  const extras = item.extraGrants?.[role] ?? [];
  return [item.permission, ...extras];
}
