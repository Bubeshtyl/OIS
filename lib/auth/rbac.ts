import type { UserRole } from "@/lib/db/schema";

export type Permission =
  | "dashboard:read"
  | "receive:write"
  | "transfer:write"
  | "sales:write"
  | "reports:read"
  | "products:manage"
  | "users:manage"
  | "reversal:write";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "dashboard:read",
    "receive:write",
    "transfer:write",
    "sales:write",
    "reports:read",
    "products:manage",
    "users:manage",
    "reversal:write",
  ],
  MANAGER: [
    "dashboard:read",
    "receive:write",
    "transfer:write",
    "sales:write",
    "reports:read",
  ],
  ACCOUNTS: ["dashboard:read", "reports:read"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canWriteInventory(role: UserRole): boolean {
  return (
    hasPermission(role, "receive:write") ||
    hasPermission(role, "transfer:write") ||
    hasPermission(role, "sales:write")
  );
}

export function getDefaultPath(role: UserRole): string {
  return role === "ACCOUNTS" ? "/reports" : "/dashboard";
}

const ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
  "/dashboard": "dashboard:read",
  "/stock-count": "dashboard:read",
  "/receive": "receive:write",
  "/transfer": "transfer:write",
  "/sales": "sales:write",
  "/reports": "reports:read",
  "/admin/products": "products:manage",
  "/admin/users": "users:manage",
};

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  for (const [route, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const perms = Array.isArray(permission) ? permission : [permission];
      return perms.some((p) => hasPermission(role, p));
    }
  }
  return true;
}

export type NavIcon =
  | "dashboard"
  | "receive"
  | "transfer"
  | "sales"
  | "reports"
  | "products"
  | "users";

export function getNavItems(
  role: UserRole
): Array<{ href: string; label: string; icon: NavIcon }> {
  const items: Array<{ href: string; label: string; icon: NavIcon }> = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/receive", label: "Stock Received", icon: "receive" },
    { href: "/transfer", label: "Stock Issued", icon: "transfer" },
    { href: "/sales", label: "Daily Consumption", icon: "sales" },
    { href: "/reports", label: "Reports", icon: "reports" },
  ];

  if (role === "ACCOUNTS") {
    return items.filter((item) =>
      ["/dashboard", "/reports"].includes(item.href)
    );
  }

  if (role === "ADMIN") {
    return [
      ...items,
      {
        href: "/admin/products",
        label: "Oil Products",
        icon: "products" as const,
      },
      { href: "/admin/users", label: "Managers", icon: "users" as const },
    ];
  }

  return items;
}
