import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { roles, teams, users, type Team, type User } from "@/lib/db/schema";

export type TeamWithManager = Team & {
  manager: User | null;
};

export type SystemUser = User & { roleName: string | null };

export async function getActiveTeams(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(teams)
    .where(and(eq(teams.tenantId, tenantId), eq(teams.isActive, true)));
}

export async function getTeamById(tenantId: string, id: string) {
  const db = getDb();
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
    .limit(1);
  return team ?? null;
}

export async function getTeamsWithManagers(
  tenantId: string
): Promise<TeamWithManager[]> {
  const db = getDb();
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.tenantId, tenantId))
    .orderBy(teams.name);
  const managers = await db
    .select()
    .from(users)
    .where(eq(users.tenantId, tenantId));

  const managerByTeamId = new Map(
    managers
      .filter((manager) => manager.teamId)
      .map((manager) => [manager.teamId!, manager])
  );

  return allTeams.map((team) => ({
    ...team,
    manager: managerByTeamId.get(team.id) ?? null,
  }));
}

/** Users not attached to any team, i.e. head-office roles (Admin, Accounts, etc). */
export async function getSystemUsers(tenantId: string): Promise<SystemUser[]> {
  const db = getDb();
  const rows = await db
    .select({
      user: users,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.tenantId, tenantId), isNull(users.teamId)))
    .orderBy(users.name);

  return rows.map(({ user, roleName }) => ({ ...user, roleName }));
}

export async function getUnassignedManagers(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenantId), isNull(users.teamId)));
}
