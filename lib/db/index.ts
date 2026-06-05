import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase transaction pooler (port 6543) does not support prepared statements.
function usesTransactionPooler(url: string) {
  return url.includes(":6543") || url.includes("pgbouncer=true");
}

function toSessionPoolerUrl(url: string) {
  return url
    .replace(":6543/", ":5432/")
    .replace(/([?&])pgbouncer=true(&)?/g, (_, prefix, suffix) =>
      suffix ? prefix : ""
    )
    .replace(/[?&]$/, "");
}

function getConnectionString() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set (or set DATABASE_MIGRATIONS_URL for a direct/session connection)"
    );
  }

  // In dev, prefer session/direct pooler (5432). The transaction pooler (6543)
  // often causes statement timeouts and multi-second page loads under parallel queries.
  if (process.env.NODE_ENV === "development") {
    if (process.env.DATABASE_MIGRATIONS_URL) {
      return process.env.DATABASE_MIGRATIONS_URL;
    }

    if (usesTransactionPooler(databaseUrl)) {
      return toSessionPoolerUrl(databaseUrl);
    }
  }

  return databaseUrl;
}

declare global {
  // eslint-disable-next-line no-var
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getClient() {
  const connectionString = getConnectionString();

  if (!global.postgresClient) {
    global.postgresClient = postgres(connectionString, {
      prepare: !usesTransactionPooler(connectionString),
      max: 10,
      idle_timeout: 30,
      connect_timeout: 15,
      max_lifetime: 60 * 30,
    });
  }

  return global.postgresClient;
}

export function getDb() {
  if (!db) {
    db = drizzle(getClient(), { schema });
  }

  return db;
}

export { schema };
