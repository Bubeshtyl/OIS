"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getDefaultPath } from "@/lib/auth/rbac";
import {
  destroySession,
  getSession,
  saveSession,
} from "@/lib/auth/session";

export type AuthResult = { success: true } | { success: false; error: string };

export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      return { success: false, error: "Invalid email or password." };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid email or password." };
    }

    await saveSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isLoggedIn: true,
    });
  } catch {
    return {
      success: false,
      error: "Unable to connect to database. Check DATABASE_URL.",
    };
  }

  const session = await getSession();
  redirect(getDefaultPath(session.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
