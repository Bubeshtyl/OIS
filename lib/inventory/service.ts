import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { computeBalanceFromLedger } from "@/lib/inventory/balances";
import {
  inventoryTransactions,
  oilProducts,
  stockBalance,
  type Location,
  type StockLocation,
  type TransactionType,
} from "@/lib/db/schema";

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

type BalanceDelta = Partial<Record<StockLocation, number>>;

function getBalanceDelta(
  type: TransactionType,
  fromLocation: Location,
  toLocation: Location,
  quantity: number
): BalanceDelta {
  const delta: BalanceDelta = {};

  if (type === "RECEIVE") {
    delta.DEPOT = (delta.DEPOT ?? 0) + quantity;
    return delta;
  }

  if (type === "TRANSFER") {
    delta.DEPOT = (delta.DEPOT ?? 0) - quantity;
    delta.MANAGER = (delta.MANAGER ?? 0) + quantity;
    return delta;
  }

  if (type === "SALE") {
    delta.MANAGER = (delta.MANAGER ?? 0) - quantity;
    return delta;
  }

  if (type === "RETURNED") {
    // Unsold stock returned from Oil Manager back to Depot.
    delta.MANAGER = (delta.MANAGER ?? 0) - quantity;
    delta.DEPOT = (delta.DEPOT ?? 0) + quantity;
    return delta;
  }

  if (type === "DAMAGED") {
    // Damaged stock is lost from Oil Manager inventory.
    delta.MANAGER = (delta.MANAGER ?? 0) - quantity;
    return delta;
  }

  if (type === "REVERSAL") {
    if (fromLocation === "DEPOT" && toLocation === "SUPPLIER") {
      delta.DEPOT = (delta.DEPOT ?? 0) - quantity;
    } else if (fromLocation === "MANAGER" && toLocation === "DEPOT") {
      delta.DEPOT = (delta.DEPOT ?? 0) + quantity;
      delta.MANAGER = (delta.MANAGER ?? 0) - quantity;
    } else if (fromLocation === "MANAGER" && toLocation === "SALE") {
      delta.MANAGER = (delta.MANAGER ?? 0) - quantity;
    } else if (fromLocation === "DEPOT" && toLocation === "MANAGER") {
      // Reversal of RETURNED (Manager -> Depot).
      delta.DEPOT = (delta.DEPOT ?? 0) - quantity;
      delta.MANAGER = (delta.MANAGER ?? 0) + quantity;
    } else if (fromLocation === "SUPPLIER" && toLocation === "DEPOT") {
      delta.DEPOT = (delta.DEPOT ?? 0) + quantity;
    } else if (fromLocation === "SALE" && toLocation === "MANAGER") {
      delta.MANAGER = (delta.MANAGER ?? 0) + quantity;
    }
  }

  return delta;
}

async function getBalance(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  productId: string,
  location: StockLocation
): Promise<number> {
  const [row] = await tx
    .select({ quantity: stockBalance.quantity })
    .from(stockBalance)
    .where(
      and(
        eq(stockBalance.productId, productId),
        eq(stockBalance.location, location)
      )
    )
    .limit(1);

  return row ? Number(row.quantity) : 0;
}

async function applyBalanceDelta(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  productId: string,
  delta: BalanceDelta
) {
  for (const location of ["DEPOT", "MANAGER"] as StockLocation[]) {
    const change = delta[location];
    if (change === undefined || change === 0) continue;

    const current = await getBalance(tx, productId, location);
    const next = current + change;

    if (next < 0) {
      throw new InventoryError(
        `Only ${current.toFixed(1)} available at ${location === "DEPOT" ? "Depot" : "Manager"}`
      );
    }

    await tx
      .insert(stockBalance)
      .values({
        productId,
        location,
        quantity: String(next),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stockBalance.productId, stockBalance.location],
        set: {
          quantity: String(next),
          updatedAt: new Date(),
        },
      });
  }
}

export interface CreateTransactionInput {
  productId: string;
  type: Exclude<TransactionType, "REVERSAL">;
  quantity: number;
  transactionDate: string;
  referenceNote?: string;
  createdBy: string;
}

export async function createInventoryTransaction(input: CreateTransactionInput) {
  if (input.quantity <= 0) {
    throw new InventoryError("Quantity must be greater than zero.");
  }

  const db = getDb();

  const [product] = await db
    .select()
    .from(oilProducts)
    .where(eq(oilProducts.id, input.productId))
    .limit(1);

  if (!product || !product.isActive) {
    throw new InventoryError("Product is inactive or not found.");
  }

  let fromLocation: Location;
  let toLocation: Location;

  switch (input.type) {
    case "RECEIVE":
      fromLocation = "SUPPLIER";
      toLocation = "DEPOT";
      break;
    case "TRANSFER":
      fromLocation = "DEPOT";
      toLocation = "MANAGER";
      break;
    case "SALE":
      fromLocation = "MANAGER";
      toLocation = "SALE";
      break;
    case "RETURNED":
      // Unsold stock returned from Oil Manager to Depot.
      fromLocation = "MANAGER";
      toLocation = "DEPOT";
      break;
    case "DAMAGED":
      // Damaged stock is removed from Oil Manager (like SALE).
      fromLocation = "MANAGER";
      toLocation = "SALE";
      break;
    default:
      throw new InventoryError("Invalid transaction type.");
  }

  const delta = getBalanceDelta(
    input.type,
    fromLocation,
    toLocation,
    input.quantity
  );

  return db.transaction(async (tx) => {
    for (const location of ["DEPOT", "MANAGER"] as StockLocation[]) {
      const change = delta[location];
      if (change !== undefined && change < 0) {
        const current = await getBalance(tx, input.productId, location);
        if (current + change < 0) {
          throw new InventoryError(
            `Only ${current.toFixed(1)} available at ${location === "DEPOT" ? "Depot" : "Manager"}`
          );
        }
      }
    }

    const [txn] = await tx
      .insert(inventoryTransactions)
      .values({
        productId: input.productId,
        type: input.type,
        quantity: String(input.quantity),
        fromLocation,
        toLocation,
        transactionDate: input.transactionDate,
        referenceNote: input.referenceNote || null,
        createdBy: input.createdBy,
      })
      .returning();

    await applyBalanceDelta(tx, input.productId, delta);
    return txn;
  });
}

export async function reverseTransaction(
  transactionId: string,
  createdBy: string,
  referenceNote?: string
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [original] = await tx
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.id, transactionId))
      .limit(1);

    if (!original) {
      throw new InventoryError("Transaction not found.");
    }

    if (original.type === "REVERSAL") {
      throw new InventoryError("Cannot reverse a reversal transaction.");
    }

    const [existingReversal] = await tx
      .select({ id: inventoryTransactions.id })
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.reversesTransactionId, transactionId))
      .limit(1);

    if (existingReversal) {
      throw new InventoryError("This transaction has already been reversed.");
    }

    const quantity = Number(original.quantity);
    const fromLocation = original.toLocation;
    const toLocation = original.fromLocation;

    const delta = getBalanceDelta(
      "REVERSAL",
      fromLocation,
      toLocation,
      quantity
    );

    for (const location of ["DEPOT", "MANAGER"] as StockLocation[]) {
      const change = delta[location];
      if (change !== undefined && change < 0) {
        const current = await getBalance(tx, original.productId, location);
        if (current + change < 0) {
          throw new InventoryError(
            `Reversal would cause negative stock at ${location === "DEPOT" ? "Depot" : "Manager"}`
          );
        }
      }
    }

    const [reversal] = await tx
      .insert(inventoryTransactions)
      .values({
        productId: original.productId,
        type: "REVERSAL",
        quantity: original.quantity,
        fromLocation,
        toLocation,
        transactionDate: original.transactionDate,
        referenceNote: referenceNote || `Reversal of ${original.id.slice(0, 8)}`,
        reversesTransactionId: original.id,
        createdBy,
      })
      .returning();

    await applyBalanceDelta(tx, original.productId, delta);
    return reversal;
  });
}

export async function getProductBalance(
  productId: string,
  location: StockLocation
): Promise<number> {
  return computeBalanceFromLedger(productId, location);
}

export async function reconcileBalances() {
  const db = getDb();

  const computed = await db.execute<{
    product_id: string;
    location: StockLocation;
    quantity: string;
  }>(sql`
    WITH movements AS (
      SELECT
        product_id,
        'DEPOT'::stock_location AS location,
        SUM(
          CASE
            WHEN to_location = 'DEPOT' THEN quantity::numeric
            WHEN from_location = 'DEPOT' THEN -quantity::numeric
            ELSE 0
          END
        ) AS quantity
      FROM inventory_transactions
      GROUP BY product_id
      UNION ALL
      SELECT
        product_id,
        'MANAGER'::stock_location AS location,
        SUM(
          CASE
            WHEN to_location = 'MANAGER' THEN quantity::numeric
            WHEN from_location = 'MANAGER' THEN -quantity::numeric
            ELSE 0
          END
        ) AS quantity
      FROM inventory_transactions
      GROUP BY product_id
    )
    SELECT product_id, location, COALESCE(SUM(quantity), 0)::text AS quantity
    FROM movements
    GROUP BY product_id, location
  `);

  const rows = computed;
  const drifts: Array<{
    productId: string;
    location: StockLocation;
    cached: number;
    computed: number;
  }> = [];

  for (const row of rows) {
    const cached = await getProductBalance(row.product_id, row.location);
    const computedQty = Number(row.quantity);
    if (Math.abs(cached - computedQty) > 0.001) {
      drifts.push({
        productId: row.product_id,
        location: row.location,
        cached,
        computed: computedQty,
      });
    }

    await db
      .insert(stockBalance)
      .values({
        productId: row.product_id,
        location: row.location,
        quantity: String(computedQty),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stockBalance.productId, stockBalance.location],
        set: {
          quantity: String(computedQty),
          updatedAt: new Date(),
        },
      });
  }

  return drifts;
}
