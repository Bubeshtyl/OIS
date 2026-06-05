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

  console.log("Schema migration applied.");
}

migrateSchema().catch((error) => {
  console.error(error);
  process.exit(1);
});
