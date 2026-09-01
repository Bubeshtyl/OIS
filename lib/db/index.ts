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

  // Production/serverless must use DATABASE_URL (transaction pooler, port 6543).
  // Session pooler (5432) has a low shared limit (~15) and exhausts under Vercel
  // concurrency when each instance opens its own pool.
  if (process.env.NODE_ENV === "production") {
    return databaseUrl;
  }

  // Local dev: prefer session pooler for parallel queries and prepared statements.
  if (process.env.DATABASE_MIGRATIONS_URL) {
    return process.env.DATABASE_MIGRATIONS_URL;
  }

  if (usesTransactionPooler(databaseUrl)) {
    return toSessionPoolerUrl(databaseUrl);
  }

  return databaseUrl;
}

function getPoolOptions(connectionString: string) {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    prepare: !usesTransactionPooler(connectionString),
    // One connection per serverless instance; session pooler cannot handle many.
    max: isProduction ? 1 : 10,
    idle_timeout: isProduction ? 10 : 30,
    connect_timeout: 15,
    max_lifetime: isProduction ? 60 * 5 : 60 * 30,
  };
}

declare global {
  // eslint-disable-next-line no-var
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getClient() {
  const connectionString = getConnectionString();

  if (!global.postgresClient) {
    global.postgresClient = postgres(connectionString, getPoolOptions(connectionString));
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
