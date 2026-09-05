import { redirect } from "next/navigation";
import { getDefaultPathSync, hasPermission, type Permission } from "@/lib/auth/rbac";
import type { SessionData } from "@/lib/auth/session-config";

export async function requirePermission(
  session: SessionData,
  permission: Permission | Permission[]
) {
  const perms = Array.isArray(permission) ? permission : [permission];
  for (const p of perms) {
    if (await hasPermission(session, p)) return;
  }
  redirect(getDefaultPathSync(session) ?? "/");
}
