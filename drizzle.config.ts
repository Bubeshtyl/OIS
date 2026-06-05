import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Prefer direct/session pooler (port 5432) for schema push; falls back to DATABASE_URL.
    url: process.env.DATABASE_MIGRATIONS_URL ?? process.env.DATABASE_URL!,
  },
});
