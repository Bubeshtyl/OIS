import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { computeBalanceFromLedger } from "@/lib/inventory/balances";
import {
  inventoryTransactions,
  oilProducts,
  returnedCaseEvents,
  returnedCases,
  stockBalance,
  type Location,
  type ReturnCaseEventType,
  type StockLocation,
  type TransactionType,
} from "@/lib/db/schema";
import {
  buildReceiveReferenceNote,
  litresFromBoxes,
  parseInvoiceFromReference,
} from "@/lib/packaging";

type DbTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

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
  tenantId: string,
  productId: string,
  location: StockLocation
): Promise<number> {
  const [row] = await tx
    .select({ quantity: stockBalance.quantity })
    .from(stockBalance)
    .where(
      and(
        eq(stockBalance.tenantId, tenantId),
        eq(stockBalance.productId, productId),
        eq(stockBalance.location, location)
      )
    )
    .limit(1);

  return row ? Number(row.quantity) : 0;
}

async function applyBalanceDelta(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  tenantId: string,
  productId: string,
  delta: BalanceDelta
) {
  for (const location of ["DEPOT", "MANAGER"] as StockLocation[]) {
    const change = delta[location];
    if (change === undefined || change === 0) continue;

    const current = await getBalance(tx, tenantId, productId, location);
    const next = current + change;

    if (next < 0) {
      throw new InventoryError(
        `Only ${current.toFixed(1)} available at ${location === "DEPOT" ? "Depot" : "Manager"}`
      );
    }

    await tx
      .insert(stockBalance)
      .values({
        tenantId,
        productId,
        location,
        quantity: String(next),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stockBalance.tenantId, stockBalance.productId, stockBalance.location],
        set: {
          quantity: String(next),
          updatedAt: new Date(),
        },
      });
  }
}

export interface ReceiveMoneyFields {
  dealerSource?: string | null;
  taxableValue?: number | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  discountAmount?: number | null;
  landingPrice?: number | null;
}

export interface CreateTransactionInput extends ReceiveMoneyFields {
  tenantId: string;
  productId: string;
  type: Exclude<TransactionType, "REVERSAL">;
  quantity: number;
  transactionDate: string;
  referenceNote?: string;
  createdBy: string;
}

function moneyOrNull(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return String(value);
}

function resolveLocations(type: Exclude<TransactionType, "REVERSAL">): {
  fromLocation: Location;
  toLocation: Location;
} {
  switch (type) {
    case "RECEIVE":
      return { fromLocation: "SUPPLIER", toLocation: "DEPOT" };
    case "TRANSFER":
      return { fromLocation: "DEPOT", toLocation: "MANAGER" };
    case "SALE":
      return { fromLocation: "MANAGER", toLocation: "SALE" };
    case "RETURNED":
      return { fromLocation: "MANAGER", toLocation: "DEPOT" };
    case "DAMAGED":
      return { fromLocation: "MANAGER", toLocation: "SALE" };
    default:
      throw new InventoryError("Invalid transaction type.");
  }
}

export async function createInventoryTransaction(input: CreateTransactionInput) {
  if (input.quantity <= 0) {
    throw new InventoryError("Quantity must be greater than zero.");
  }

  const db = getDb();

  const [product] = await db
    .select()
    .from(oilProducts)
    .where(
      and(
        eq(oilProducts.id, input.productId),
        eq(oilProducts.tenantId, input.tenantId)
      )
    )
    .limit(1);

  if (!product || !product.isActive) {
    throw new InventoryError("Product is inactive or not found.");
  }

  const { fromLocation, toLocation } = resolveLocations(input.type);

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
        const current = await getBalance(tx, input.tenantId, input.productId, location);
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
        tenantId: input.tenantId,
        productId: input.productId,
        type: input.type,
        quantity: String(input.quantity),
        fromLocation,
        toLocation,
        transactionDate: input.transactionDate,
        referenceNote: input.referenceNote || null,
        dealerSource: input.dealerSource ?? null,
        taxableValue: moneyOrNull(input.taxableValue),
        cgstAmount: moneyOrNull(input.cgstAmount),
        sgstAmount: moneyOrNull(input.sgstAmount),
        discountAmount: moneyOrNull(input.discountAmount),
        landingPrice: moneyOrNull(input.landingPrice),
        createdBy: input.createdBy,
      })
      .returning();

    await applyBalanceDelta(tx, input.tenantId, input.productId, delta);
    return txn;
  });
}

export type BpclReceiveLineInput = {
  productId: string;
  quantityLitres: number;
  packageCount: number;
  returnedCases?: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  discountAmount: number;
  landingPrice: number;
};

function buildBpclReferenceNote(packageCount: number, invoice: string) {
  return [
    `Packages: ${packageCount}`,
    "Supplier: BPCL",
    `Invoice: ${invoice}`,
  ].join("\n");
}

async function recordReturnCaseEvent(
  tx: DbTx,
  input: {
    tenantId: string;
    returnedCaseId: string;
    eventType: ReturnCaseEventType;
    detail?: string;
    createdBy: string;
  }
) {
  await tx.insert(returnedCaseEvents).values({
    tenantId: input.tenantId,
    returnedCaseId: input.returnedCaseId,
    eventType: input.eventType,
    detail: input.detail ?? null,
    createdBy: input.createdBy,
  });
}

/** Upsert or clear the returned-cases row for a receive line (any dealer). */
async function syncReturnedCases(
  tx: DbTx,
  input: {
    tenantId: string;
    productId: string;
    receiveTransactionId: string;
    dealerSource: string;
    invoice: string;
    casesReturned: number;
    createdBy: string;
  }
) {
  const casesReturned = Math.max(0, Math.floor(input.casesReturned));
  const dealerSource = input.dealerSource.trim();
  const [existing] = await tx
    .select()
    .from(returnedCases)
    .where(eq(returnedCases.receiveTransactionId, input.receiveTransactionId))
    .limit(1);

  if (casesReturned < 1) {
    if (existing) {
      if ((existing.casesReplaced ?? 0) > 0) {
        throw new InventoryError(
          "Cannot clear returned cases after a replacement has been recorded."
        );
      }
      await tx.delete(returnedCases).where(eq(returnedCases.id, existing.id));
    }
    return;
  }

  if (!existing) {
    const [created] = await tx
      .insert(returnedCases)
      .values({
        tenantId: input.tenantId,
        productId: input.productId,
        receiveTransactionId: input.receiveTransactionId,
        dealerSource,
        invoice: input.invoice,
        casesReturned,
        casesReplaced: 0,
        status: "OPEN",
        createdBy: input.createdBy,
      })
      .returning();

    await recordReturnCaseEvent(tx, {
      tenantId: input.tenantId,
      returnedCaseId: created.id,
      eventType: "RECORDED",
      detail: `${casesReturned} case${casesReturned === 1 ? "" : "s"} returned on ${dealerSource} invoice ${input.invoice}`,
      createdBy: input.createdBy,
    });
    return;
  }

  if (casesReturned < existing.casesReplaced) {
    throw new InventoryError(
      `Cannot set returned cases below ${existing.casesReplaced} already replaced.`
    );
  }

  const changed =
    existing.casesReturned !== casesReturned ||
    existing.invoice !== input.invoice ||
    existing.productId !== input.productId ||
    existing.dealerSource !== dealerSource;

  if (!changed) return;

  const status =
    existing.casesReplaced >= casesReturned ? "REPLACED" : existing.status;

  await tx
    .update(returnedCases)
    .set({
      productId: input.productId,
      dealerSource,
      invoice: input.invoice,
      casesReturned,
      status,
      updatedAt: new Date(),
    })
    .where(eq(returnedCases.id, existing.id));

  await recordReturnCaseEvent(tx, {
    tenantId: input.tenantId,
    returnedCaseId: existing.id,
    eventType: "UPDATED",
    detail: `Updated to ${casesReturned} case${casesReturned === 1 ? "" : "s"} on ${dealerSource} invoice ${input.invoice}`,
    createdBy: input.createdBy,
  });
}

/** Create multiple BPCL RECEIVE rows and credit depot balances in one DB transaction. */
export async function createBpclReceiveBatch(input: {
  tenantId: string;
  transactionDate: string;
  invoice: string;
  createdBy: string;
  lines: BpclReceiveLineInput[];
}) {
  if (input.lines.length === 0) {
    throw new InventoryError("Add at least one product with quantity.");
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const created = [];

    for (const line of input.lines) {
      if (line.quantityLitres <= 0) {
        throw new InventoryError("Quantity must be greater than zero.");
      }

      const [product] = await tx
        .select()
        .from(oilProducts)
        .where(
          and(
            eq(oilProducts.id, line.productId),
            eq(oilProducts.tenantId, input.tenantId)
          )
        )
        .limit(1);

      if (!product || !product.isActive) {
        throw new InventoryError(
          `Product is inactive or not found${product ? `: ${product.name}` : ""}.`
        );
      }

      const fromLocation: Location = "SUPPLIER";
      const toLocation: Location = "DEPOT";
      const delta = getBalanceDelta(
        "RECEIVE",
        fromLocation,
        toLocation,
        line.quantityLitres
      );

      const returnedCases = Math.max(0, Math.floor(line.returnedCases ?? 0));
      const referenceNote = buildBpclReferenceNote(
        line.packageCount,
        input.invoice
      );

      const [txn] = await tx
        .insert(inventoryTransactions)
        .values({
          tenantId: input.tenantId,
          productId: line.productId,
          type: "RECEIVE",
          quantity: String(line.quantityLitres),
          fromLocation,
          toLocation,
          transactionDate: input.transactionDate,
          referenceNote,
          dealerSource: "BPCL",
          taxableValue: moneyOrNull(line.taxableValue),
          cgstAmount: moneyOrNull(line.cgstAmount),
          sgstAmount: moneyOrNull(line.sgstAmount),
          discountAmount: moneyOrNull(line.discountAmount),
          landingPrice: moneyOrNull(line.landingPrice),
          createdBy: input.createdBy,
        })
        .returning();

      await applyBalanceDelta(tx, input.tenantId, line.productId, delta);
      await syncReturnedCases(tx, {
        tenantId: input.tenantId,
        productId: line.productId,
        receiveTransactionId: txn.id,
        dealerSource: "BPCL",
        invoice: input.invoice,
        casesReturned: returnedCases,
        createdBy: input.createdBy,
      });
      created.push(txn);
    }

    return created;
  });
}

/** Replace an existing BPCL invoice batch; adjusts depot stock by litre deltas. */
export async function updateBpclReceiveBatch(input: {
  tenantId: string;
  originalInvoice: string;
  transactionDate: string;
  invoice: string;
  createdBy: string;
  lines: BpclReceiveLineInput[];
}) {
  if (input.lines.length === 0) {
    throw new InventoryError("Add at least one product with quantity.");
  }

  const originalInvoice = input.originalInvoice.trim();
  const nextInvoice = input.invoice.trim();
  if (!originalInvoice || !nextInvoice) {
    throw new InventoryError("Invoice number is required.");
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(inventoryTransactions)
      .where(
        and(
          eq(inventoryTransactions.tenantId, input.tenantId),
          eq(inventoryTransactions.type, "RECEIVE"),
          eq(inventoryTransactions.dealerSource, "BPCL")
        )
      );

    const batchRows = existingRows.filter(
      (row) => parseInvoiceFromReference(row.referenceNote) === originalInvoice
    );

    if (batchRows.length === 0) {
      throw new InventoryError("Invoice not found.");
    }

    if (nextInvoice !== originalInvoice) {
      const conflict = existingRows.some((row) => {
        const invoice = parseInvoiceFromReference(row.referenceNote);
        return invoice === nextInvoice && !batchRows.some((b) => b.id === row.id);
      });
      if (conflict) {
        throw new InventoryError(
          `Invoice ${nextInvoice} already exists. Use a different invoice number.`
        );
      }
    }

    const existingByProduct = new Map(
      batchRows.map((row) => [row.productId, row] as const)
    );
    if (existingByProduct.size !== batchRows.length) {
      throw new InventoryError(
        "This invoice has duplicate product lines and cannot be edited automatically."
      );
    }

    const nextProductIds = new Set(input.lines.map((line) => line.productId));
    const productIds = [
      ...new Set([
        ...batchRows.map((row) => row.productId),
        ...input.lines.map((line) => line.productId),
      ]),
    ];

    const products = await tx
      .select()
      .from(oilProducts)
      .where(
        and(
          eq(oilProducts.tenantId, input.tenantId),
          inArray(oilProducts.id, productIds)
        )
      );
    const productById = new Map(products.map((p) => [p.id, p] as const));

    for (const row of batchRows) {
      if (nextProductIds.has(row.productId)) continue;
      const litres = Number(row.quantity);
      await applyBalanceDelta(tx, input.tenantId, row.productId, {
        DEPOT: -litres,
      });
      await tx
        .delete(inventoryTransactions)
        .where(eq(inventoryTransactions.id, row.id));
    }

    const updated = [];
    for (const line of input.lines) {
      if (line.quantityLitres <= 0) {
        throw new InventoryError("Quantity must be greater than zero.");
      }

      const product = productById.get(line.productId);
      if (!product || !product.isActive) {
        throw new InventoryError(
          `Product is inactive or not found${product ? `: ${product.name}` : ""}.`
        );
      }

      const returnedCases = Math.max(0, Math.floor(line.returnedCases ?? 0));
      const referenceNote = buildBpclReferenceNote(
        line.packageCount,
        nextInvoice
      );
      const existing = existingByProduct.get(line.productId);

      if (existing) {
        const oldLitres = Number(existing.quantity);
        const deltaLitres = line.quantityLitres - oldLitres;
        if (deltaLitres !== 0) {
          await applyBalanceDelta(tx, input.tenantId, line.productId, {
            DEPOT: deltaLitres,
          });
        }

        const [txn] = await tx
          .update(inventoryTransactions)
          .set({
            quantity: String(line.quantityLitres),
            transactionDate: input.transactionDate,
            referenceNote,
            taxableValue: moneyOrNull(line.taxableValue),
            cgstAmount: moneyOrNull(line.cgstAmount),
            sgstAmount: moneyOrNull(line.sgstAmount),
            discountAmount: moneyOrNull(line.discountAmount),
            landingPrice: moneyOrNull(line.landingPrice),
          })
          .where(eq(inventoryTransactions.id, existing.id))
          .returning();

        await syncReturnedCases(tx, {
          tenantId: input.tenantId,
          productId: line.productId,
          receiveTransactionId: txn.id,
          dealerSource: "BPCL",
          invoice: nextInvoice,
          casesReturned: returnedCases,
          createdBy: input.createdBy,
        });
        updated.push(txn);
      } else {
        const [txn] = await tx
          .insert(inventoryTransactions)
          .values({
            tenantId: input.tenantId,
            productId: line.productId,
            type: "RECEIVE",
            quantity: String(line.quantityLitres),
            fromLocation: "SUPPLIER",
            toLocation: "DEPOT",
            transactionDate: input.transactionDate,
            referenceNote,
            dealerSource: "BPCL",
            taxableValue: moneyOrNull(line.taxableValue),
            cgstAmount: moneyOrNull(line.cgstAmount),
            sgstAmount: moneyOrNull(line.sgstAmount),
            discountAmount: moneyOrNull(line.discountAmount),
            landingPrice: moneyOrNull(line.landingPrice),
            createdBy: input.createdBy,
          })
          .returning();

        await applyBalanceDelta(tx, input.tenantId, line.productId, {
          DEPOT: line.quantityLitres,
        });
        await syncReturnedCases(tx, {
          tenantId: input.tenantId,
          productId: line.productId,
          receiveTransactionId: txn.id,
          dealerSource: "BPCL",
          invoice: nextInvoice,
          casesReturned: returnedCases,
          createdBy: input.createdBy,
        });
        updated.push(txn);
      }
    }

    return updated;
  });
}

/** Record a replacement receive for an open returned-case row and link them. */
export async function markReturnedCaseReplaced(input: {
  tenantId: string;
  returnedCaseId: string;
  replacementInvoice: string;
  transactionDate: string;
  casesReplaced: number;
  createdBy: string;
  notes?: string;
}) {
  const replacementInvoice = input.replacementInvoice.trim();
  if (!replacementInvoice) {
    throw new InventoryError("Replacement invoice number is required.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transactionDate)) {
    throw new InventoryError("Date is required.");
  }
  const casesReplaced = Math.floor(input.casesReplaced);
  if (!Number.isInteger(casesReplaced) || casesReplaced < 1) {
    throw new InventoryError("Replacement quantity must be at least 1 case.");
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const [openReturn] = await tx
      .select()
      .from(returnedCases)
      .where(
        and(
          eq(returnedCases.id, input.returnedCaseId),
          eq(returnedCases.tenantId, input.tenantId)
        )
      )
      .limit(1);

    if (!openReturn) {
      throw new InventoryError("Returned case record not found.");
    }
    if (openReturn.status !== "OPEN") {
      throw new InventoryError("This return is already closed or replaced.");
    }
    const alreadyReplaced = openReturn.casesReplaced ?? 0;
    const casesPending = openReturn.casesReturned - alreadyReplaced;
    if (casesPending < 1) {
      throw new InventoryError("No open returned cases left to replace.");
    }
    if (casesReplaced > casesPending) {
      throw new InventoryError(
        `Only ${casesPending} case${casesPending === 1 ? "" : "s"} still open for replacement.`
      );
    }

    if (openReturn.dealerSource === "BPCL") {
      const existingReceives = await tx
        .select({
          id: inventoryTransactions.id,
          referenceNote: inventoryTransactions.referenceNote,
        })
        .from(inventoryTransactions)
        .where(
          and(
            eq(inventoryTransactions.tenantId, input.tenantId),
            eq(inventoryTransactions.type, "RECEIVE"),
            eq(inventoryTransactions.dealerSource, "BPCL")
          )
        );
      const invoiceTaken = existingReceives.some(
        (row) =>
          parseInvoiceFromReference(row.referenceNote) === replacementInvoice
      );
      if (invoiceTaken) {
        throw new InventoryError(
          `Invoice ${replacementInvoice} already exists. Use a different replacement invoice number.`
        );
      }
    }

    const [product] = await tx
      .select()
      .from(oilProducts)
      .where(
        and(
          eq(oilProducts.id, openReturn.productId),
          eq(oilProducts.tenantId, input.tenantId)
        )
      )
      .limit(1);

    if (!product) {
      throw new InventoryError("Product not found for this return.");
    }

    const litres = litresFromBoxes(casesReplaced, product);
    if (litres == null) {
      throw new InventoryError(
        `${product.name} is missing case packaging. Update the product first.`
      );
    }

    const referenceNote = [
      buildReceiveReferenceNote({
        packageCount: casesReplaced,
        supplier: openReturn.dealerSource,
        invoice: replacementInvoice,
      }),
      `Replacement for return on invoice ${openReturn.invoice}`,
      input.notes?.trim() || null,
    ]
      .filter(Boolean)
      .join("\n");

    const [replacementTxn] = await tx
      .insert(inventoryTransactions)
      .values({
        tenantId: input.tenantId,
        productId: openReturn.productId,
        type: "RECEIVE",
        quantity: String(litres),
        fromLocation: "SUPPLIER",
        toLocation: "DEPOT",
        transactionDate: input.transactionDate,
        referenceNote,
        dealerSource: openReturn.dealerSource,
        createdBy: input.createdBy,
      })
      .returning();

    await applyBalanceDelta(tx, input.tenantId, openReturn.productId, {
      DEPOT: litres,
    });

    const totalReplaced = alreadyReplaced + casesReplaced;
    const remaining = openReturn.casesReturned - totalReplaced;
    const fullyReplaced = remaining === 0;

    await tx
      .update(returnedCases)
      .set({
        casesReplaced: totalReplaced,
        status: fullyReplaced ? "REPLACED" : "OPEN",
        replacementReceiveTransactionId: replacementTxn.id,
        replacementInvoice,
        replacedAt: fullyReplaced ? new Date() : openReturn.replacedAt,
        notes: input.notes?.trim() || openReturn.notes,
        updatedAt: new Date(),
      })
      .where(eq(returnedCases.id, openReturn.id));

    await recordReturnCaseEvent(tx, {
      tenantId: input.tenantId,
      returnedCaseId: openReturn.id,
      eventType: "REPLACEMENT_LINKED",
      detail: fullyReplaced
        ? `Fully replaced ${casesReplaced} case${casesReplaced === 1 ? "" : "s"} on invoice ${replacementInvoice} (${totalReplaced}/${openReturn.casesReturned})`
        : `Partial replacement of ${casesReplaced} case${casesReplaced === 1 ? "" : "s"} on invoice ${replacementInvoice}; ${remaining} of ${openReturn.casesReturned} still open`,
      createdBy: input.createdBy,
    });

    if (fullyReplaced) {
      await recordReturnCaseEvent(tx, {
        tenantId: input.tenantId,
        returnedCaseId: openReturn.id,
        eventType: "CLOSED",
        detail: `Return closed after replacement invoice ${replacementInvoice}`,
        createdBy: input.createdBy,
      });
    }

    return {
      replacementTransactionId: replacementTxn.id,
      fullyReplaced,
      remainingCases: remaining,
      totalReturned: openReturn.casesReturned,
      totalReplaced,
    };
  });
}

export async function getProductBalance(
  tenantId: string,
  productId: string,
  location: StockLocation
): Promise<number> {
  return computeBalanceFromLedger(tenantId, productId, location);
}

export async function reconcileBalances() {
  const db = getDb();

  const computed = await db.execute<{
    tenant_id: string;
    product_id: string;
    location: StockLocation;
    quantity: string;
  }>(sql`
    WITH movements AS (
      SELECT
        tenant_id,
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
      GROUP BY tenant_id, product_id
      UNION ALL
      SELECT
        tenant_id,
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
      GROUP BY tenant_id, product_id
    )
    SELECT tenant_id, product_id, location, COALESCE(SUM(quantity), 0)::text AS quantity
    FROM movements
    GROUP BY tenant_id, product_id, location
  `);

  const rows = computed;
  const drifts: Array<{
    tenantId: string;
    productId: string;
    location: StockLocation;
    cached: number;
    computed: number;
  }> = [];

  for (const row of rows) {
    const cached = await getProductBalance(row.tenant_id, row.product_id, row.location);
    const computedQty = Number(row.quantity);
    if (Math.abs(cached - computedQty) > 0.001) {
      drifts.push({
        tenantId: row.tenant_id,
        productId: row.product_id,
        location: row.location,
        cached,
        computed: computedQty,
      });
    }

    await db
      .insert(stockBalance)
      .values({
        tenantId: row.tenant_id,
        productId: row.product_id,
        location: row.location,
        quantity: String(computedQty),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stockBalance.tenantId, stockBalance.productId, stockBalance.location],
        set: {
          quantity: String(computedQty),
          updatedAt: new Date(),
        },
      });
  }

  return drifts;
}
