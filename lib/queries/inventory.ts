import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { inventoryTransactions, oilProducts } from "@/lib/db/schema";
import { addIstDays, parseIstDate } from "@/lib/date-range";
import { getIstTodayString } from "@/lib/timezone";
import {
  litresToPackets,
  parsePackageCountFromNote,
  transactionPacketCount,
} from "@/lib/packaging";

export async function getActiveProducts() {
  const db = getDb();
  return db
    .select()
    .from(oilProducts)
    .where(eq(oilProducts.isActive, true))
    .orderBy(oilProducts.name);
}

export async function getAllProducts() {
  const db = getDb();
  return db.select().from(oilProducts).orderBy(oilProducts.name);
}

async function getComputedBalancesFromLedger() {
  const db = getDb();
  const rows = await db.execute<{
    product_id: string;
    location: "DEPOT" | "MANAGER";
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

  const byProduct = new Map<
    string,
    { depot: number; manager: number }
  >();

  for (const row of rows) {
    const current = byProduct.get(row.product_id) ?? { depot: 0, manager: 0 };
    const qty = Number(row.quantity);
    if (row.location === "DEPOT") {
      current.depot = qty;
    } else {
      current.manager = qty;
    }
    byProduct.set(row.product_id, current);
  }

  return byProduct;
}

export async function getStockSummary() {
  const db = getDb();
  const [products, balances] = await Promise.all([
    db
      .select({
        id: oilProducts.id,
        name: oilProducts.name,
        unit: oilProducts.unit,
        costPrice: oilProducts.costPrice,
        sellingPrice: oilProducts.sellingPrice,
        lowStockThreshold: oilProducts.lowStockThreshold,
        packetsPerBox: oilProducts.packetsPerBox,
        volumePerPacket: oilProducts.volumePerPacket,
      })
      .from(oilProducts)
      .where(eq(oilProducts.isActive, true))
      .orderBy(oilProducts.name),
    getComputedBalancesFromLedger(),
  ]);

  let depotQty = 0;
  let managerQty = 0;
  let depotPackets = 0;
  let managerPackets = 0;
  let depotValue = 0;
  let managerValue = 0;

  const productRows = products.map((product) => {
    const balance = balances.get(product.id) ?? { depot: 0, manager: 0 };
    const cost = Number(product.costPrice);
    const depotPacketCount =
      litresToPackets(balance.depot, product) ?? 0;
    const managerPacketCount =
      litresToPackets(balance.manager, product) ?? 0;

    depotQty += balance.depot;
    managerQty += balance.manager;
    depotPackets += depotPacketCount;
    managerPackets += managerPacketCount;
    depotValue += balance.depot * cost;
    managerValue += balance.manager * cost;

    return {
      id: product.id,
      name: product.name,
      unit: product.unit,
      depot: balance.depot,
      manager: balance.manager,
      depotPackets: depotPacketCount,
      managerPackets: managerPacketCount,
      packetsPerBox: product.packetsPerBox,
      volumePerPacket: product.volumePerPacket,
      costPrice: cost,
      sellingPrice: Number(product.sellingPrice),
      lowStockThreshold: product.lowStockThreshold
        ? Number(product.lowStockThreshold)
        : null,
    };
  });

  return {
    depotQty,
    managerQty,
    depotPackets,
    managerPackets,
    depotValue,
    managerValue,
    products: productRows,
  };
}

export async function getProductActivityForRange(
  startDate: string,
  endDate: string
) {
  const db = getDb();
  const rows = await db
    .select({
      productId: inventoryTransactions.productId,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      referenceNote: inventoryTransactions.referenceNote,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .where(
      and(
        gte(inventoryTransactions.transactionDate, startDate),
        lte(inventoryTransactions.transactionDate, endDate),
        inArray(inventoryTransactions.type, ["RECEIVE", "TRANSFER", "SALE"])
      )
    );

  const byProduct = new Map<
    string,
    {
      received: number;
      issued: number;
      consumed: number;
      receivedPackets: number;
      issuedPackets: number;
      consumedPackets: number;
    }
  >();

  for (const row of rows) {
    const entry = byProduct.get(row.productId) ?? {
      received: 0,
      issued: 0,
      consumed: 0,
      receivedPackets: 0,
      issuedPackets: 0,
      consumedPackets: 0,
    };
    const qty = Number(row.quantity);
    const packageCount = parsePackageCountFromNote(row.referenceNote);
    const packets = transactionPacketCount(
      row.type,
      qty,
      packageCount,
      row
    );
    if (row.type === "RECEIVE") {
      entry.received += qty;
      entry.receivedPackets += packets;
    } else if (row.type === "TRANSFER") {
      entry.issued += qty;
      entry.issuedPackets += packets;
    } else if (row.type === "SALE") {
      entry.consumed += qty;
      entry.consumedPackets += packets;
    }
    byProduct.set(row.productId, entry);
  }

  return byProduct;
}

export async function getActivityForRange(startDate: string, endDate: string) {
  const db = getDb();
  const rows = await db
    .select({
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      referenceNote: inventoryTransactions.referenceNote,
      costPrice: oilProducts.costPrice,
      sellingPrice: oilProducts.sellingPrice,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .where(
      and(
        gte(inventoryTransactions.transactionDate, startDate),
        lte(inventoryTransactions.transactionDate, endDate)
      )
    );

  let receiveQty = 0;
  let receiveValue = 0;
  let receivePackets = 0;
  let transferQty = 0;
  let transferPackets = 0;
  let saleQty = 0;
  let salePackets = 0;
  let saleValue = 0;

  for (const row of rows) {
    const qty = Number(row.quantity);
    const packageCount = parsePackageCountFromNote(row.referenceNote);
    const packets = transactionPacketCount(
      row.type,
      qty,
      packageCount,
      row
    );
    if (row.type === "RECEIVE") {
      receiveQty += qty;
      receivePackets += packets;
      receiveValue += qty * Number(row.costPrice);
    } else if (row.type === "TRANSFER") {
      transferQty += qty;
      transferPackets += packets;
    } else if (row.type === "SALE") {
      saleQty += qty;
      salePackets += packets;
      saleValue += qty * Number(row.sellingPrice);
    }
  }

  return {
    receiveQty,
    receiveValue,
    receivePackets,
    transferQty,
    transferPackets,
    saleQty,
    salePackets,
    saleValue,
  };
}

export async function getTodayActivity(date = getIstTodayString()) {
  return getActivityForRange(date, date);
}

export async function getTotalSalesQuantity() {
  const db = getDb();
  const rows = await db
    .select({ quantity: inventoryTransactions.quantity })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.type, "SALE"));

  return rows.reduce((sum, row) => sum + Number(row.quantity), 0);
}

async function getProductIdsIssuedToManager() {
  const db = getDb();
  const rows = await db
    .selectDistinct({ productId: inventoryTransactions.productId })
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.type, "TRANSFER"));

  return new Set(rows.map((row) => row.productId));
}

export async function getLowStockAlerts() {
  const [summary, issuedToManager] = await Promise.all([
    getStockSummary(),
    getProductIdsIssuedToManager(),
  ]);

  return summary.products.filter(
    (p) =>
      p.lowStockThreshold !== null &&
      p.volumePerPacket != null &&
      issuedToManager.has(p.id) &&
      p.managerPackets <= p.lowStockThreshold
  );
}

export async function getRecentTransactions(
  type?: "RECEIVE" | "TRANSFER" | "SALE",
  limit = 10,
  range?: { startDate: string; endDate: string }
) {
  const db = getDb();
  const conditions = [];

  if (type) {
    conditions.push(eq(inventoryTransactions.type, type));
  }
  if (range) {
    conditions.push(
      gte(inventoryTransactions.transactionDate, range.startDate),
      lte(inventoryTransactions.transactionDate, range.endDate)
    );
  }

  return db
    .select({
      id: inventoryTransactions.id,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      transactionDate: inventoryTransactions.transactionDate,
      referenceNote: inventoryTransactions.referenceNote,
      productName: oilProducts.name,
      unit: oilProducts.unit,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
      createdAt: inventoryTransactions.createdAt,
      reversesTransactionId: inventoryTransactions.reversesTransactionId,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(limit);
}

export async function getSalesForDateRange(startDate: string, endDate: string) {
  const db = getDb();
  const rows = await db
    .select({
      transactionDate: inventoryTransactions.transactionDate,
      quantity: inventoryTransactions.quantity,
      referenceNote: inventoryTransactions.referenceNote,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .where(
      and(
        eq(inventoryTransactions.type, "SALE"),
        gte(inventoryTransactions.transactionDate, startDate),
        lte(inventoryTransactions.transactionDate, endDate)
      )
    );

  const map = new Map<string, { packets: number; litres: number }>();
  let current = startDate;

  while (current <= endDate) {
    map.set(current, { packets: 0, litres: 0 });
    current = addIstDays(current, 1);
  }

  for (const row of rows) {
    const litres = Number(row.quantity);
    const packageCount = parsePackageCountFromNote(row.referenceNote);
    const packets = transactionPacketCount(
      "SALE",
      litres,
      packageCount,
      row
    );
    const entry = map.get(row.transactionDate) ?? { packets: 0, litres: 0 };
    entry.packets += packets;
    entry.litres += litres;
    map.set(row.transactionDate, entry);
  }

  const dayCount = map.size;

  return Array.from(map.entries()).map(([date, totals]) => ({
    date,
    quantity: totals.packets,
    packets: totals.packets,
    litres: totals.litres,
    label:
      dayCount <= 7
        ? parseIstDate(date).toLocaleDateString("en-IN", {
            weekday: "short",
            timeZone: "Asia/Kolkata",
          })
        : parseIstDate(date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          }),
  }));
}

export async function getSalesLast7Days() {
  const today = getIstTodayString();
  return getSalesForDateRange(addIstDays(today, -6), today);
}

export async function getTodaySales(date = getIstTodayString()) {
  const db = getDb();
  return db
    .select({
      productName: oilProducts.name,
      unit: oilProducts.unit,
      quantity: inventoryTransactions.quantity,
      sellingPrice: oilProducts.sellingPrice,
      referenceNote: inventoryTransactions.referenceNote,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .where(
      and(
        eq(inventoryTransactions.type, "SALE"),
        eq(inventoryTransactions.transactionDate, date)
      )
    )
    .orderBy(oilProducts.name);
}

export async function getLedger(filters?: {
  type?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = getDb();
  const conditions = [];

  if (filters?.type && filters.type !== "ALL") {
    conditions.push(
      eq(
        inventoryTransactions.type,
        filters.type as "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL"
      )
    );
  }
  if (filters?.productId) {
    conditions.push(eq(inventoryTransactions.productId, filters.productId));
  }
  if (filters?.startDate) {
    conditions.push(
      gte(inventoryTransactions.transactionDate, filters.startDate)
    );
  }
  if (filters?.endDate) {
    conditions.push(
      lte(inventoryTransactions.transactionDate, filters.endDate)
    );
  }

  return db
    .select({
      id: inventoryTransactions.id,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      fromLocation: inventoryTransactions.fromLocation,
      toLocation: inventoryTransactions.toLocation,
      transactionDate: inventoryTransactions.transactionDate,
      referenceNote: inventoryTransactions.referenceNote,
      createdAt: inventoryTransactions.createdAt,
      reversesTransactionId: inventoryTransactions.reversesTransactionId,
      productName: oilProducts.name,
      unit: oilProducts.unit,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(inventoryTransactions.transactionDate), desc(inventoryTransactions.createdAt));
}

export async function getDailySummary(startDate: string, endDate: string) {
  const db = getDb();
  const rows = await db
    .select({
      transactionDate: inventoryTransactions.transactionDate,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      referenceNote: inventoryTransactions.referenceNote,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .where(
      and(
        gte(inventoryTransactions.transactionDate, startDate),
        lte(inventoryTransactions.transactionDate, endDate)
      )
    );

  const map = new Map<
    string,
    { received: number; transferred: number; sold: number }
  >();

  for (const row of rows) {
    if (!map.has(row.transactionDate)) {
      map.set(row.transactionDate, {
        received: 0,
        transferred: 0,
        sold: 0,
      });
    }
    const entry = map.get(row.transactionDate)!;
    const qty = Number(row.quantity);
    const packageCount = parsePackageCountFromNote(row.referenceNote);
    const packets = transactionPacketCount(
      row.type,
      qty,
      packageCount,
      row
    );
    if (row.type === "RECEIVE") entry.received += packets;
    else if (row.type === "TRANSFER") entry.transferred += packets;
    else if (row.type === "SALE") entry.sold += packets;
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, values]) => ({ date, ...values }));
}

export async function getReversedTransactionIdsFor(transactionIds: string[]) {
  if (transactionIds.length === 0) {
    return new Set<string>();
  }

  const db = getDb();
  const rows = await db
    .select({
      reversesTransactionId: inventoryTransactions.reversesTransactionId,
    })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.type, "REVERSAL"),
        inArray(inventoryTransactions.reversesTransactionId, transactionIds)
      )
    );

  return new Set(
    rows
      .map((r) => r.reversesTransactionId)
      .filter((id): id is string => Boolean(id))
  );
}
