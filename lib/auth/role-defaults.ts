export type Permission =
  | "dashboard:read"
  | "shift-closing:read"
  | "receive:write"
  | "transfer:write"
  | "sales:write"
  | "reports:read"
  | "file-upload:read"
  | "daily-sales:read"
  | "sales-data-analytics:read"
  | "products:manage"
  | "taxation:read"
  | "staff:read"
  | "customers:read"
  | "users:manage"
  | "tickets:read"
  | "tickets:manage"
  | "teams:manage"
  | "questions:manage"
  | "settings:manage";

/** Full permission set for the system Admin role on every tenant. */
export const ADMIN_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "shift-closing:read",
  "receive:write",
  "transfer:write",
  "sales:write",
  "reports:read",
  "file-upload:read",
  "daily-sales:read",
  "sales-data-analytics:read",
  "products:manage",
  "taxation:read",
  "staff:read",
  "customers:read",
  "users:manage",
  "tickets:read",
  "tickets:manage",
  "teams:manage",
  "questions:manage",
  "settings:manage",
];

/** Defaults used when seeding Manager / Accounts on migration. */
export const LEGACY_ROLE_PERMISSIONS: Record<
  "MANAGER" | "ACCOUNTS",
  Permission[]
> = {
  MANAGER: [
    "dashboard:read",
    "shift-closing:read",
    "receive:write",
    "transfer:write",
    "sales:write",
    "reports:read",
    "file-upload:read",
    "daily-sales:read",
    "sales-data-analytics:read",
    "tickets:read",
    "tickets:manage",
  ],
  ACCOUNTS: [
    "dashboard:read",
    "shift-closing:read",
    "reports:read",
    "file-upload:read",
    "daily-sales:read",
    "sales-data-analytics:read",
    "tickets:read",
  ],
};

export const SYSTEM_ADMIN_ROLE_NAME = "Admin";
export const SYSTEM_MANAGER_ROLE_NAME = "Manager";
export const SYSTEM_ACCOUNTS_ROLE_NAME = "Accounts";

/** Reserved — only platform-provisioned bootstrap account. */
export const PRIME_ROLE_NAME = "Prime";

export function isReservedPrimeName(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === "prime";
}
