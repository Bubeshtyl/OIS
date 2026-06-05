import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { StockLocation } from "@/lib/db/schema";

export async function computeBalanceFromLedger(
  productId: string,
  location: StockLocation
): Promise<number> {
  const db = getDb();
  const [row] = await db.execute<{ quantity: string }>(sql`
    SELECT COALESCE(SUM(
      CASE
        ${
          location === "DEPOT"
            ? sql`
                WHEN to_location = 'DEPOT' THEN quantity::numeric
                WHEN from_location = 'DEPOT' THEN -quantity::numeric
              `
            : sql`
                WHEN to_location = 'MANAGER' THEN quantity::numeric
                WHEN from_location = 'MANAGER' THEN -quantity::numeric
              `
        }
        ELSE 0
      END
    ), 0)::text AS quantity
    FROM inventory_transactions
    WHERE product_id = ${productId}
  `);

  return row ? Number(row.quantity) : 0;
}
