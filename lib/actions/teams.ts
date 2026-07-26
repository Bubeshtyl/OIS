"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidateTeamPages } from "@/lib/actions/revalidate";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { teams, users } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions/inventory";
import {
  getSystemUsers,
  getTeamsWithManagers,
} from "@/lib/teams/service";

const teamSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  telegramChatId: z.string().min(1),
  isActive: z.coerce.boolean(),
  managerUserId: z.string().uuid().optional(),
  managerName: z.string().min(1),
  managerUsername: z
    .string()
    .min(3)
    .max(32)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores."
    ),
  managerPassword: z.string().min(6).optional(),
});

export async function saveTeamAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  if (
    !(await hasPermission(session.role, "teams:manage")) ||
    !(await hasPermission(session.role, "users:manage"))
  ) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = teamSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    telegramChatId: formData.get("telegramChatId"),
    isActive: formData.get("isActive") === "true",
    managerUserId: formData.get("managerUserId") || undefined,
    managerName: formData.get("managerName"),
    managerUsername: formData.get("managerUsername"),
    managerPassword: formData.get("managerPassword") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check all required fields.",
    };
  }

  if (!parsed.data.id && !parsed.data.managerPassword) {
    return {
      success: false,
      error: "A password is required for the manager login.",
    };
  }

  const db = getDb();
  const teamValues = {
    name: parsed.data.name,
    telegramChatId: parsed.data.telegramChatId,
    isActive: parsed.data.isActive,
  };

  try {
    await db.transaction(async (tx) => {
      let teamId = parsed.data.id;

      if (teamId) {
        await tx.update(teams).set(teamValues).where(eq(teams.id, teamId));
      } else {
        const [inserted] = await tx
          .insert(teams)
          .values(teamValues)
          .returning({ id: teams.id });
        teamId = inserted.id;
      }

      const managerValues = {
        name: parsed.data.managerName,
        username: parsed.data.managerUsername.toLowerCase(),
        role: "MANAGER" as const,
        teamId,
        isActive: parsed.data.isActive,
      };

      if (parsed.data.managerUserId) {
        const update: {
          name: string;
          username: string;
          role: "MANAGER";
          teamId: string;
          isActive: boolean;
          passwordHash?: string;
        } = managerValues;

        if (parsed.data.managerPassword) {
          update.passwordHash = await bcrypt.hash(parsed.data.managerPassword, 10);
        }

        await tx
          .update(users)
          .set(update)
          .where(eq(users.id, parsed.data.managerUserId));
      } else {
        await tx.insert(users).values({
          ...managerValues,
          passwordHash: await bcrypt.hash(parsed.data.managerPassword!, 10),
        });
      }
    });
  } catch {
    return {
      success: false,
      error: "Could not save team. Check that the team name and username are unique.",
    };
  }

  revalidateTeamPages();
  return { success: true, message: "Team saved." };
}

export async function getAllTeams() {
  const session = await requireSession();
  if (!(await hasPermission(session.role, "teams:manage"))) {
    return [];
  }

  return getTeamsWithManagers();
}

export async function getTeamConfiguration() {
  const session = await requireSession();
  if (
    !(await hasPermission(session.role, "teams:manage")) ||
    !(await hasPermission(session.role, "users:manage"))
  ) {
    return { teams: [], systemUsers: [] };
  }

  const [teamsWithManagers, systemUsers] = await Promise.all([
    getTeamsWithManagers(),
    getSystemUsers(),
  ]);

  return { teams: teamsWithManagers, systemUsers };
}
