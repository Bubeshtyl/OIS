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
  returnedCases,
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
import {
  TRANSACTION_LIST_FETCH_LIMIT,
  TRANSACTION_LIST_PAGE_SIZE,
} from "@/lib/transactions/types";

export type {
  ConsumptionSummary,
  IssuedSummary,
  ReceiveSummary,
  TransactionListRow,
  TransactionListSummary,
  TransactionListType,
} from "@/lib/transactions/types";
export { TRANSACTION_LIST_FETCH_LIMIT, TRANSACTION_LIST_PAGE_SIZE };

function buildConditions(filters: {
  tenantId: string;
  types: TransactionListType[];
  startDate: string;
  endDate: string;
  productId?: string;
  recordedBy?: string;
  search?: string;
}) {
  const conditions = [
    eq(inventoryTransactions.tenantId, filters.tenantId),
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
      dealerSource: inventoryTransactions.dealerSource,
      taxableValue: inventoryTransactions.taxableValue,
      cgstAmount: inventoryTransactions.cgstAmount,
      sgstAmount: inventoryTransactions.sgstAmount,
      discountAmount: inventoryTransactions.discountAmount,
      landingPrice: inventoryTransactions.landingPrice,
      casesReturned: returnedCases.casesReturned,
      casesReplaced: returnedCases.casesReplaced,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .innerJoin(users, eq(inventoryTransactions.createdBy, users.id))
    .leftJoin(
      returnedCases,
      eq(returnedCases.receiveTransactionId, inventoryTransactions.id)
    );
}

export async function getDistinctCreatorsForType(
  tenantId: string,
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
        eq(inventoryTransactions.tenantId, tenantId),
        eq(inventoryTransactions.type, type),
        gte(inventoryTransactions.transactionDate, startDate),
        lte(inventoryTransactions.transactionDate, endDate)
      )
    )
    .orderBy(users.name);
}

type SummarySourceRow = {
  type: string;
  quantity: string;
  transactionDate: string;
  referenceNote: string | null;
  costPrice: string;
  createdById: string;
  packetsPerBox: string | null;
  volumePerPacket: string | null;
  taxableValue: string | null;
  cgstAmount: string | null;
  sgstAmount: string | null;
  discountAmount: string | null;
  landingPrice: string | null;
};

/** Build list summary from already-fetched rows — avoids a second full-table scan. */
function computeSummaryFromRows(
  types: TransactionListType[],
  rows: SummarySourceRow[],
  startDate: string,
  endDate: string
): TransactionListSummary {
  const type = types[0];

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
      const packets = rowPackets(litres, row.referenceNote, row);
      totalPackets += packets;
      if (row.taxableValue != null) {
        const taxable = Number(row.taxableValue);
        const discount = Number(row.discountAmount ?? 0);
        const cgst = Number(row.cgstAmount ?? 0);
        const sgst = Number(row.sgstAmount ?? 0);
        totalCost += taxable - discount + cgst + sgst;
      } else if (row.landingPrice != null && packets > 0) {
        totalCost += Number(row.landingPrice) * packets;
      } else {
        totalCost += litres * Number(row.costPrice);
      }
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
  tenantId: string;
  types: TransactionListType[];
  startDate: string;
  endDate: string;
  recordedBy?: string;
  limit?: number;
}) {
  const whereClause = buildConditions(filters);
  const limit = filters.limit ?? TRANSACTION_LIST_FETCH_LIMIT;

  const rows = await baseQuery()
    .where(whereClause)
    .orderBy(
      desc(inventoryTransactions.transactionDate),
      desc(inventoryTransactions.createdAt)
    )
    .limit(limit + 1);

  const truncated = rows.length > limit;
  const pageRows = truncated ? rows.slice(0, limit) : rows;

  const summary = computeSummaryFromRows(
    filters.types,
    pageRows,
    filters.startDate,
    filters.endDate
  );

  return {
    rows: pageRows.map((row) => {
      const casesReturned = row.casesReturned ?? 0;
      const casesReplaced = row.casesReplaced ?? 0;
      const openReturned = Math.max(0, casesReturned - casesReplaced);
      const { casesReturned: _cr, casesReplaced: _cx, ...rest } = row;
      return {
        ...rest,
        // Show still-open returned cases (replaced qty is already in receive packages).
        returnedCases: openReturned > 0 ? openReturned : null,
      };
    }) as TransactionListRow[],
    summary,
    truncated,
    fetchLimit: limit,
  };
}
