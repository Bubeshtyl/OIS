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
  isLoggedIn: boolean;
  /** Cached at login to avoid DB round trips on every request. */
  permissions?: Permission[];
  tenantOnboardingComplete?: boolean;
  tenantIsActive?: boolean;
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
