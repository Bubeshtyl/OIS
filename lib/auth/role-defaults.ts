export type Permission =
  | "dashboard:read"
  | "receive:write"
  | "transfer:write"
  | "sales:write"
  | "reports:read"
  | "file-upload:read"
  | "daily-sales:read"
  | "sales-data-analytics:read"
  | "products:manage"
  | "users:manage"
  | "tickets:read"
  | "tickets:manage"
  | "teams:manage"
  | "questions:manage"
  | "settings:manage";

/** Full permission set for the system Admin role on every tenant. */
export const ADMIN_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "receive:write",
  "transfer:write",
  "sales:write",
  "reports:read",
  "file-upload:read",
  "daily-sales:read",
  "sales-data-analytics:read",
  "products:manage",
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
