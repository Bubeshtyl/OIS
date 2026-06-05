import { config } from "dotenv";
import { eq, ne } from "drizzle-orm";
import { getDb } from "../lib/db";
import { inventoryTransactions, oilProducts } from "../lib/db/schema";
import { reconcileBalances } from "../lib/inventory/service";
import {
  litresFromBoxes,
  litresFromPackets,
  parsePackageCountFromNote,
} from "../lib/packaging";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const db = getDb();
  const rows = await db
    .select({
      id: inventoryTransactions.id,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      referenceNote: inventoryTransactions.referenceNote,
      productName: oilProducts.name,
      product: oilProducts,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .where(ne(inventoryTransactions.type, "REVERSAL"));

  let fixed = 0;

  for (const row of rows) {
    const packageCount = parsePackageCountFromNote(row.referenceNote);
    if (packageCount == null) continue;

    let correctLitres: number | null = null;
    if (row.type === "RECEIVE" || row.type === "TRANSFER") {
      correctLitres = litresFromBoxes(packageCount, row.product);
    } else if (row.type === "SALE") {
      correctLitres = litresFromPackets(packageCount, row.product);
    }

    if (correctLitres == null) continue;

    const current = Number(row.quantity);
    if (Math.abs(current - correctLitres) < 0.001) continue;

    await db
      .update(inventoryTransactions)
      .set({ quantity: String(correctLitres) })
      .where(eq(inventoryTransactions.id, row.id));

    console.log(
      `  ${row.productName} ${row.type}: ${current} L → ${correctLitres} L (${packageCount} packages)`
    );
    fixed += 1;
  }

  if (fixed === 0) {
    console.log("All transaction quantities already match package counts.");
  } else {
    console.log(`\nFixed ${fixed} transaction(s). Reconciling balances...`);
    const drifts = await reconcileBalances();
    if (drifts.length === 0) {
      console.log("Balances updated.");
    } else {
      for (const drift of drifts) {
        console.log(
          `  ${drift.productId} @ ${drift.location}: ${drift.cached} → ${drift.computed}`
        );
      }
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
