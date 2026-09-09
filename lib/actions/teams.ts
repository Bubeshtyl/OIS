"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidateTeamPages } from "@/lib/actions/revalidate";
import { hasPermission } from "@/lib/auth/rbac";
import {
  ensureTenantRoleByName,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { LEGACY_ROLE_PERMISSIONS, SYSTEM_MANAGER_ROLE_NAME, isReservedPrimeName } from "@/lib/auth/role-defaults";
import { getUserRoleOptions } from "@/lib/actions/admin";
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
  const session = await requireTenantSession();
  if (
    !(await hasPermission(session, "teams:manage")) ||
    !(await hasPermission(session, "users:manage"))
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

  if (
    isReservedPrimeName(parsed.data.managerUsername) ||
    isReservedPrimeName(parsed.data.managerName)
  ) {
    return {
      success: false,
      error: "Prime is reserved. Only Platform can provision the Prime user.",
    };
  }

  const tenantId = session.tenantId;
  const managerRoleId = await ensureTenantRoleByName(
    tenantId,
    SYSTEM_MANAGER_ROLE_NAME,
    LEGACY_ROLE_PERMISSIONS.MANAGER
  );

  const db = getDb();
  const teamValues = {
    tenantId,
    name: parsed.data.name,
    telegramChatId: parsed.data.telegramChatId,
    isActive: parsed.data.isActive,
  };

  try {
    await db.transaction(async (tx) => {
      let teamId = parsed.data.id;

      if (teamId) {
        await tx
          .update(teams)
          .set(teamValues)
          .where(and(eq(teams.id, teamId), eq(teams.tenantId, tenantId)));
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
        tenantId,
        roleId: managerRoleId,
        teamId,
        isActive: parsed.data.isActive,
      };

      if (parsed.data.managerUserId) {
        const [existingManager] = await tx
          .select({ isPrime: users.isPrime })
          .from(users)
          .where(
            and(
              eq(users.id, parsed.data.managerUserId),
              eq(users.tenantId, tenantId)
            )
          )
          .limit(1);
        if (existingManager?.isPrime) {
          throw new Error("Prime users are managed from Platform only.");
        }

        const update: {
          name: string;
          username: string;
          tenantId: string;
          roleId: string;
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
          .where(
            and(
              eq(users.id, parsed.data.managerUserId),
              eq(users.tenantId, tenantId)
            )
          );
      } else {
        await tx.insert(users).values({
          ...managerValues,
          isPrime: false,
          isPlatformAdmin: false,
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
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "teams:manage"))) {
    return [];
  }

  return getTeamsWithManagers(session.tenantId);
}

export async function getTeamConfiguration() {
  const session = await requireTenantSession();
  if (
    !(await hasPermission(session, "teams:manage")) ||
    !(await hasPermission(session, "users:manage"))
  ) {
    return { teams: [], systemUsers: [], roleOptions: [] };
  }

  const [teamsWithManagers, systemUsers, roleOptions] = await Promise.all([
    getTeamsWithManagers(session.tenantId),
    getSystemUsers(session.tenantId),
    getUserRoleOptions(),
  ]);

  return { teams: teamsWithManagers, systemUsers, roleOptions };
}
