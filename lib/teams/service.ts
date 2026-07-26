import { eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { teams, users, type Team, type User } from "@/lib/db/schema";

export type TeamWithManager = Team & {
  manager: User | null;
};

export async function getActiveTeams() {
  const db = getDb();
  return db.select().from(teams).where(eq(teams.isActive, true));
}

export async function getTeamById(id: string) {
  const db = getDb();
  const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return team ?? null;
}

export async function getTeamsWithManagers(): Promise<TeamWithManager[]> {
  const db = getDb();
  const allTeams = await db.select().from(teams).orderBy(teams.name);
  const managers = await db
    .select()
    .from(users)
    .where(eq(users.role, "MANAGER"));

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

export async function getSystemUsers() {
  const db = getDb();
  return db
    .select()
    .from(users)
    .where(or(eq(users.role, "ADMIN"), eq(users.role, "ACCOUNTS")))
    .orderBy(users.name);
}

export async function getUnassignedManagers() {
  const db = getDb();
  return db
    .select()
    .from(users)
    .where(eq(users.role, "MANAGER"))
    .then((rows) => rows.filter((row) => !row.teamId));
}
