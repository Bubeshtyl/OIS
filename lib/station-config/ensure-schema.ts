import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

let ensured = false;
let ensuring: Promise<void> | null = null;

/**
 * Idempotent DDL for station pump serial numbers (6AM slip grouping).
 * Safe to call on every request; runs once per process.
 */
export async function ensureStationPumpSerialSchema(): Promise<void> {
  if (ensured) return;
  if (ensuring) return ensuring;

  ensuring = (async () => {
    const db = getDb();

    await db.execute(sql`
      ALTER TABLE station_pumps
      ADD COLUMN IF NOT EXISTS serial_number text
    `);

    await db.execute(sql`
      UPDATE station_pumps SET serial_number = '202206000654'
      WHERE pump_number IN (1, 2) AND (serial_number IS NULL OR serial_number = '')
    `);
    await db.execute(sql`
      UPDATE station_pumps SET serial_number = 'M2446157'
      WHERE pump_number IN (3, 4) AND (serial_number IS NULL OR serial_number = '')
    `);
    await db.execute(sql`
      UPDATE station_pumps SET serial_number = '202206000650'
      WHERE pump_number IN (5, 6) AND (serial_number IS NULL OR serial_number = '')
    `);

    ensured = true;
  })().finally(() => {
    ensuring = null;
  });

  return ensuring;
}
