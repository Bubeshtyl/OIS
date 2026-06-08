import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  inventoryTransactions,
  oilProducts,
  users,
} from "@/lib/db/schema";
import { istDaySpan } from "@/lib/date-range";
import {
  parsePackageCountFromNote,
  transactionPacketCount,
} from "@/lib/packaging";
import type {
  ConsumptionSummary,
  IssuedSummary,
  ReceiveSummary,
  TransactionListRow,
  TransactionListSummary,
  TransactionListType,
} from "@/lib/transactions/types";

export type {
  ConsumptionSummary,
  IssuedSummary,
  ReceiveSummary,
  TransactionListRow,
  TransactionListSummary,
  TransactionListType,
} from "@/lib/transactions/types";
export { TRANSACTION_LIST_PAGE_SIZE } from "@/lib/transactions/types";

function buildConditions(filters: {
  types: TransactionListType[];
  startDate: string;
  endDate: string;
  productId?: string;
  recordedBy?: string;
  search?: string;
}) {
  const conditions = [
    inArray(inventoryTransactions.type, filters.types),
    gte(inventoryTransactions.transactionDate, filters.startDate),
    lte(inventoryTransactions.transactionDate, filters.endDate),
  ];

  if (filters.productId) {
    conditions.push(eq(inventoryTransactions.productId, filters.productId));
  }

  if (filters.recordedBy) {
    conditions.push(eq(inventoryTransactions.createdBy, filters.recordedBy));
  }

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        ilike(oilProducts.name, term),
        ilike(inventoryTransactions.referenceNote, term),
        ilike(users.name, term)
      )!
    );
  }

  return and(...conditions);
}

function baseQuery() {
  const db = getDb();
  return db
    .select({
      id: inventoryTransactions.id,
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      transactionDate: inventoryTransactions.transactionDate,
      createdAt: inventoryTransactions.createdAt,
      referenceNote: inventoryTransactions.referenceNote,
      productId: inventoryTransactions.productId,
      productName: oilProducts.name,
      unit: oilProducts.unit,
      costPrice: oilProducts.costPrice,
      sellingPrice: oilProducts.sellingPrice,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
      volumePerBox: oilProducts.volumePerBox,
      createdByName: users.name,
      createdById: users.id,
      reversesTransactionId: inventoryTransactions.reversesTransactionId,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .innerJoin(users, eq(inventoryTransactions.createdBy, users.id));
}

export async function getDistinctCreatorsForType(
  type: TransactionListType,
  startDate: string,
  endDate: string
) {
  const db = getDb();
  return db
    .selectDistinct({
      id: users.id,
      name: users.name,
    })
    .from(inventoryTransactions)
    .innerJoin(users, eq(inventoryTransactions.createdBy, users.id))
    .where(
      and(
        eq(inventoryTransactions.type, type),
        gte(inventoryTransactions.transactionDate, startDate),
        lte(inventoryTransactions.transactionDate, endDate)
      )
    )
    .orderBy(users.name);
}

async function computeSummary(
  types: TransactionListType[],
  whereClause: ReturnType<typeof and>,
  startDate: string,
  endDate: string
): Promise<TransactionListSummary> {
  const db = getDb();
  const type = types[0];

  const rows = await db
    .select({
      type: inventoryTransactions.type,
      quantity: inventoryTransactions.quantity,
      transactionDate: inventoryTransactions.transactionDate,
      referenceNote: inventoryTransactions.referenceNote,
      costPrice: oilProducts.costPrice,
      createdById: users.id,
      packetsPerBox: oilProducts.packetsPerBox,
      volumePerPacket: oilProducts.volumePerPacket,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .innerJoin(users, eq(inventoryTransactions.createdBy, users.id))
    .where(whereClause);

  function rowPackets(
    litres: number,
    referenceNote: string | null,
    product: {
      packetsPerBox: string | null;
      volumePerPacket: string | null;
    }
  ) {
    const packageCount = parsePackageCountFromNote(referenceNote);
    return transactionPacketCount(type, litres, packageCount, product);
  }

  if (types.length === 1 && type === "RECEIVE") {
    let totalLitres = 0;
    let totalPackets = 0;
    let totalCost = 0;
    for (const row of rows) {
      const litres = Number(row.quantity);
      totalLitres += litres;
      totalPackets += rowPackets(litres, row.referenceNote, row);
      totalCost += litres * Number(row.costPrice);
    }
    return {
      totalLitres,
      totalPackets,
      totalCost,
      avgCostPerLitre: totalLitres > 0 ? totalCost / totalLitres : 0,
      count: rows.length,
    };
  }

  if (types.length === 1 && type === "TRANSFER") {
    const creators = new Set<string>();
    let totalLitres = 0;
    let totalPackets = 0;
    for (const row of rows) {
      const litres = Number(row.quantity);
      totalLitres += litres;
      totalPackets += rowPackets(litres, row.referenceNote, row);
      creators.add(row.createdById);
    }
    return {
      totalLitres,
      totalPackets,
      count: rows.length,
      activeCreators: creators.size,
    };
  }

  // Consumption net: sold + damaged at Oil Manager (returns to Depot are tracked separately).
  let totalLitres = 0;
  let totalPackets = 0;
  for (const row of rows) {
    if (row.type === "RETURNED") continue;

    const litres = Number(row.quantity);
    const packageCount = parsePackageCountFromNote(row.referenceNote);
    const packetsAbs = transactionPacketCount(
      "SALE",
      litres,
      packageCount,
      row
    );

    totalLitres += litres;
    totalPackets += packetsAbs;
  }

  const daySpan = istDaySpan(startDate, endDate);

  return {
    totalLitres,
    totalPackets,
    count: rows.length,
    dailyAverage: totalLitres / daySpan,
    dailyAveragePackets: totalPackets / daySpan,
  };
}

export async function getAllTransactionRows(filters: {
  types: TransactionListType[];
  startDate: string;
  endDate: string;
  recordedBy?: string;
}) {
  const whereClause = buildConditions(filters);

  const rows = await baseQuery()
    .where(whereClause)
    .orderBy(
      desc(inventoryTransactions.transactionDate),
      desc(inventoryTransactions.createdAt)
    );

  const summary = await computeSummary(
    filters.types,
    whereClause,
    filters.startDate,
    filters.endDate
  );

  return {
    rows: rows as TransactionListRow[],
    summary,
  };
}
