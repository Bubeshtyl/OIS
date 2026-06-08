import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  inventoryTransactions,
  oilProducts,
  users,
} from "@/lib/db/schema";
import {
  parsePackageCountFromNote,
  transactionPacketCount,
} from "@/lib/packaging";

export type TransactionListType = "RECEIVE" | "TRANSFER" | "SALE";

export type TransactionListRow = {
  id: string;
  type: "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL";
  quantity: string;
  transactionDate: string;
  referenceNote: string | null;
  productId: string;
  productName: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  packetsPerBox: string | null;
  volumePerPacket: string | null;
  volumePerBox: string | null;
  createdByName: string;
  createdById: string;
  reversesTransactionId: string | null;
};

export type ReceiveSummary = {
  totalLitres: number;
  totalPackets: number;
  totalCost: number;
  avgCostPerLitre: number;
  count: number;
};

export type IssuedSummary = {
  totalLitres: number;
  totalPackets: number;
  count: number;
  activeCreators: number;
};

export type ConsumptionSummary = {
  totalLitres: number;
  totalPackets: number;
  count: number;
  dailyAverage: number;
  dailyAveragePackets: number;
};

export type TransactionListSummary =
  | ReceiveSummary
  | IssuedSummary
  | ConsumptionSummary;

function buildConditions(filters: {
  type: TransactionListType;
  startDate: string;
  endDate: string;
  productId?: string;
  recordedBy?: string;
  search?: string;
}) {
  const conditions = [
    eq(inventoryTransactions.type, filters.type),
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
  type: TransactionListType,
  whereClause: ReturnType<typeof and>,
  startDate: string,
  endDate: string
): Promise<TransactionListSummary> {
  const db = getDb();
  const rows = await db
    .select({
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

  if (type === "RECEIVE") {
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

  if (type === "TRANSFER") {
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

  let totalLitres = 0;
  let totalPackets = 0;
  for (const row of rows) {
    const litres = Number(row.quantity);
    totalLitres += litres;
    totalPackets += rowPackets(litres, row.referenceNote, row);
  }

  const daySpan = Math.max(
    1,
    Math.round(
      (new Date(`${endDate}T12:00:00`).getTime() -
        new Date(`${startDate}T12:00:00`).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );

  return {
    totalLitres,
    totalPackets,
    count: rows.length,
    dailyAverage: totalLitres / daySpan,
    dailyAveragePackets: totalPackets / daySpan,
  };
}

export async function getTransactionList(filters: {
  type: TransactionListType;
  startDate: string;
  endDate: string;
  productId?: string;
  recordedBy?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 10;
  const offset = (page - 1) * pageSize;
  const whereClause = buildConditions(filters);

  const [countRow] = await getDb()
    .select({ total: count() })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .innerJoin(users, eq(inventoryTransactions.createdBy, users.id))
    .where(whereClause);

  const total = Number(countRow?.total ?? 0);

  const rows = await baseQuery()
    .where(whereClause)
    .orderBy(
      desc(inventoryTransactions.transactionDate),
      desc(inventoryTransactions.createdAt)
    )
    .limit(pageSize)
    .offset(offset);

  const summary = await computeSummary(
    filters.type,
    whereClause,
    filters.startDate,
    filters.endDate
  );

  return {
    rows: rows as TransactionListRow[],
    total,
    page,
    pageSize,
    summary,
  };
}
