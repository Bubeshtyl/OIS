import { SessionOptions } from "iron-session";

export interface SessionData {
  userId: string;
  username: string;
  name: string;
  tenantId: string | null;
  roleId: string | null;
  roleName: string | null;
  isPlatformAdmin: boolean;
  isLoggedIn: boolean;
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
