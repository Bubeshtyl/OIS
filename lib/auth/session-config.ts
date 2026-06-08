import { SessionOptions } from "iron-session";
import type { UserRole } from "@/lib/db/schema";

export interface SessionData {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  userId: "",
  username: "",
  name: "",
  role: "MANAGER",
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "dev-only-secret-change-in-production-32chars",
  cookieName: "ois_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};
