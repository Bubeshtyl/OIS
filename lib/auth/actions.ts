"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { roles, tenants, users } from "@/lib/db/schema";
import { getPermissionsForRoleId } from "@/lib/auth/permissions";
import { getDefaultPathSync } from "@/lib/auth/rbac";
import { SYSTEM_ADMIN_ROLE_NAME } from "@/lib/auth/role-defaults";
import type { SessionData } from "@/lib/auth/session-config";
import { destroySession, saveSession } from "@/lib/auth/session";

export type AuthResult = { success: true } | { success: false; error: string };

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const username = String(formData.get("username") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { success: false, error: "Username and password are required." };
  }

  let sessionPayload: SessionData;

  try {
    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        passwordHash: users.passwordHash,
        tenantId: users.tenantId,
        roleId: users.roleId,
        isPlatformAdmin: users.isPlatformAdmin,
        isActive: users.isActive,
        roleName: roles.name,
        roleIsSystem: roles.isSystem,
        tenantIsActive: tenants.isActive,
        tenantOnboardingComplete: tenants.onboardingComplete,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.username, username))
      .limit(1);

    if (!user || !user.isActive) {
      return { success: false, error: "Invalid username or password." };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid username or password." };
    }

    if (!user.isPlatformAdmin && (!user.tenantId || !user.roleId)) {
      return {
        success: false,
        error: "User is not assigned to a tenant role. Contact your admin.",
      };
    }

    if (!user.isPlatformAdmin && user.tenantIsActive === false) {
      return {
        success: false,
        error: "This station is suspended. Contact support.",
      };
    }

    // Permissions + last-login write in parallel after password check.
    const [permissions] = await Promise.all([
      user.isPlatformAdmin
        ? Promise.resolve([] as Awaited<ReturnType<typeof getPermissionsForRoleId>>)
        : getPermissionsForRoleId(user.roleId),
      db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id)),
    ]);

    sessionPayload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleName: user.roleName,
      isPlatformAdmin: user.isPlatformAdmin,
      isLoggedIn: true,
      permissions,
      tenantOnboardingComplete: user.tenantOnboardingComplete ?? false,
      tenantIsActive: user.tenantIsActive ?? true,
      isSystemAdmin: Boolean(
        user.roleIsSystem && user.roleName === SYSTEM_ADMIN_ROLE_NAME
      ),
    };

    await saveSession(sessionPayload);
  } catch {
    return {
      success: false,
      error: "Unable to connect to database. Check DATABASE_URL.",
    };
  }

  redirect(getDefaultPathSync(sessionPayload) ?? "/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
