import type { UserRole } from "@/lib/db/schema";

export type Permission =
  | "dashboard:read"
  | "receive:write"
  | "transfer:write"
  | "sales:write"
  | "reports:read"
  | "products:manage"
  | "users:manage"
  | "reversal:write"
  | "tickets:read"
  | "tickets:manage"
  | "teams:manage"
  | "questions:manage"
  | "settings:manage";

export type EditableRole = "MANAGER" | "ACCOUNTS";

/** Hard-coded defaults — used when the Access UI flag is off, and as Admin’s always-on set. */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "dashboard:read",
    "receive:write",
    "transfer:write",
    "sales:write",
    "reports:read",
    "products:manage",
    "users:manage",
    "reversal:write",
    "tickets:read",
    "tickets:manage",
    "teams:manage",
    "questions:manage",
    "settings:manage",
  ],
  MANAGER: [
    "dashboard:read",
    "receive:write",
    "transfer:write",
    "sales:write",
    "reports:read",
    "tickets:read",
    "tickets:manage",
  ],
  ACCOUNTS: ["dashboard:read", "reports:read", "tickets:read"],
};
