import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";

config({ path: ".env.local" });
config({ path: ".env" });

async function migrateSchema() {
  const db = getDb();

  await db.execute(sql`
    ALTER TABLE oil_products
    ADD COLUMN IF NOT EXISTS volume_per_box numeric(12, 3)
  `);

  await db.execute(sql`
    ALTER TABLE oil_products
    ADD COLUMN IF NOT EXISTS packets_per_box numeric(12, 0)
  `);

  await db.execute(sql`
    ALTER TABLE oil_products
    ADD COLUMN IF NOT EXISTS volume_per_packet numeric(12, 3)
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TYPE product_unit ADD VALUE IF NOT EXISTS 'millilitre';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'RETURNED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DAMAGED';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'username'
      ) THEN
        ALTER TABLE users RENAME COLUMN email TO username;
        UPDATE users SET username = 'admin' WHERE username = 'admin@station.com';
      END IF;
    END
    $$;
  `);

  console.log("Schema migration applied.");
}

migrateSchema().catch((error) => {
  console.error(error);
  process.exit(1);
});
