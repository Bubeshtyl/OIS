import { config } from "dotenv";
import { reconcileBalances } from "../lib/inventory/service";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const drifts = await reconcileBalances();

  if (drifts.length === 0) {
    console.log("All balances match the transaction ledger.");
  } else {
    console.log("Fixed drift in the following balances:");
    for (const drift of drifts) {
      console.log(
        `  ${drift.productId} @ ${drift.location}: cache ${drift.cached} → ${drift.computed}`
      );
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
