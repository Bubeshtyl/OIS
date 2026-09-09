import { SessionOptions } from "iron-session";
import type { Permission } from "@/lib/auth/role-defaults";

export interface SessionData {
  userId: string;
  username: string;
  name: string;
  tenantId: string | null;
  roleId: string | null;
  roleName: string | null;
  isPlatformAdmin: boolean;
  /** Real Prime user for this tenant (DB flag). */
  isPrime: boolean;
  /**
   * Platform superuser currently acting as Prime for `tenantId`.
   * When set, `isPlatformAdmin` stays true.
   */
  isAssumingPrime: boolean;
  /** Display name of the station while assuming (banner). */
  assumedTenantName?: string | null;
  isLoggedIn: boolean;
  /** Cached at login to avoid DB round trips on every request. */
  permissions?: Permission[];
  tenantOnboardingComplete?: boolean;
  tenantIsActive?: boolean;
  /** @deprecated Prefer isPrime / isAssumingPrime. Kept for older cookies. */
  isSystemAdmin?: boolean;
}

export const defaultSession: SessionData = {
  userId: "",
  username: "",
  name: "",
  tenantId: null,
  roleId: null,
  roleName: null,
  isPlatformAdmin: false,
  isPrime: false,
  isAssumingPrime: false,
  assumedTenantName: null,
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "dev-only-secret-change-in-production-32chars",
  cookieName: "ois_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};
