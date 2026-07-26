import {
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  vehicleSegmentDbValue,
  wallDateTimeToTimestamp,
  type DailySalesCondition,
  type DailySalesFilters,
} from "@/lib/daily-sales/filters";
import { getDb } from "@/lib/db";
import { dailySales } from "@/lib/db/schema";

export const DAILY_SALES_PAGE_SIZE = 50;

export type DailySalesReportRow = {
  receiptNo: string;
  startDate: Date;
  endDate: Date;
  product: string;
  amount: string;
  volumeLitre: string;
  ratePerLtr: string;
  mopType: string;
  dsmName: string;
  bayNo: number | null;
  nozzleNo: number | null;
  startTot: string;
  endTot: string;
  discountAmount: string;
  netAmount: string;
  vehicleNo: string | null;
  vehicleSegment: string | null;
  mobileNo: string | null;
  loadedAt: Date;
  updatedAt: Date | null;
};

function conditionToSql(condition: DailySalesCondition): SQL | undefined {
  const value = condition.value.trim();
  if (!value) return undefined;

  switch (condition.field) {
    case "ratePerLtr": {
      if (condition.op === "eq") return eq(dailySales.ratePerLtr, value);
      if (condition.op === "gte") return gte(dailySales.ratePerLtr, value);
      if (condition.op === "lte") return lte(dailySales.ratePerLtr, value);
      return undefined;
    }
    case "dsmName": {
      if (condition.op === "is") return eq(dailySales.dsmName, value);
      if (condition.op === "contains") {
        return ilike(dailySales.dsmName, `%${value}%`);
      }
      return undefined;
    }
    case "bayNo": {
      const n = Number(value);
      if (!Number.isInteger(n)) return undefined;
      if (condition.op === "eq") return eq(dailySales.bayNo, n);
      return undefined;
    }
    case "nozzleNo": {
      const n = Number(value);
      if (!Number.isInteger(n)) return undefined;
      if (condition.op === "eq") return eq(dailySales.nozzleNo, n);
      return undefined;
    }
    case "startTot": {
      if (condition.op === "eq") return eq(dailySales.startTot, value);
      if (condition.op === "gte") return gte(dailySales.startTot, value);
      if (condition.op === "lte") return lte(dailySales.startTot, value);
      return undefined;
    }
    case "endTot": {
      if (condition.op === "eq") return eq(dailySales.endTot, value);
      if (condition.op === "gte") return gte(dailySales.endTot, value);
      if (condition.op === "lte") return lte(dailySales.endTot, value);
      return undefined;
    }
    case "discountAmount": {
      if (condition.op === "eq") return eq(dailySales.discountAmount, value);
      if (condition.op === "gte") return gte(dailySales.discountAmount, value);
      if (condition.op === "lte") return lte(dailySales.discountAmount, value);
      return undefined;
    }
    case "netAmount": {
      if (condition.op === "eq") return eq(dailySales.netAmount, value);
      if (condition.op === "gte") return gte(dailySales.netAmount, value);
      if (condition.op === "lte") return lte(dailySales.netAmount, value);
      return undefined;
    }
    default:
      return undefined;
  }
}

function buildFilterWhere(filters: DailySalesFilters): SQL | undefined {
  const parts: SQL[] = [];

  if (filters.start) {
    parts.push(
      gte(
        dailySales.startDate,
        sql`${wallDateTimeToTimestamp(filters.start, "start")}::timestamp`
      )
    );
  }
  if (filters.end) {
    parts.push(
      lte(
        dailySales.startDate,
        sql`${wallDateTimeToTimestamp(filters.end, "end")}::timestamp`
      )
    );
  }
  if (filters.receiptFrom) {
    parts.push(gte(dailySales.receiptNo, filters.receiptFrom));
  }
  if (filters.receiptTo) {
    parts.push(lte(dailySales.receiptNo, filters.receiptTo));
  }
  if (filters.product) {
    parts.push(eq(dailySales.product, filters.product));
  }
  if (filters.mopType) {
    parts.push(eq(dailySales.mopType, filters.mopType));
  }
  if (filters.amountMin) {
    parts.push(gte(dailySales.amount, filters.amountMin));
  }
  if (filters.amountMax) {
    parts.push(lte(dailySales.amount, filters.amountMax));
  }
  if (filters.volumeMin) {
    parts.push(gte(dailySales.volumeLitre, filters.volumeMin));
  }
  if (filters.volumeMax) {
    parts.push(lte(dailySales.volumeLitre, filters.volumeMax));
  }

  const segment = vehicleSegmentDbValue(filters.vehicleSegment);
  if (segment) {
    parts.push(eq(dailySales.vehicleSegment, segment));
  }

  if (filters.vehicleOrMobile) {
    const term = `%${filters.vehicleOrMobile}%`;
    parts.push(
      or(ilike(dailySales.vehicleNo, term), ilike(dailySales.mobileNo, term))!
    );
  }

  for (const condition of filters.conditions ?? []) {
    const clause = conditionToSql(condition);
    if (clause) parts.push(clause);
  }

  if (parts.length === 0) return undefined;
  return and(...parts);
}

const dailySalesSelect = {
  receiptNo: dailySales.receiptNo,
  startDate: dailySales.startDate,
  endDate: dailySales.endDate,
  product: dailySales.product,
  amount: dailySales.amount,
  volumeLitre: dailySales.volumeLitre,
  ratePerLtr: dailySales.ratePerLtr,
  mopType: dailySales.mopType,
  dsmName: dailySales.dsmName,
  bayNo: dailySales.bayNo,
  nozzleNo: dailySales.nozzleNo,
  startTot: dailySales.startTot,
  endTot: dailySales.endTot,
  discountAmount: dailySales.discountAmount,
  netAmount: dailySales.netAmount,
  vehicleNo: dailySales.vehicleNo,
  vehicleSegment: dailySales.vehicleSegment,
  mobileNo: dailySales.mobileNo,
  loadedAt: dailySales.loadedAt,
  updatedAt: dailySales.updatedAt,
};

export async function getDailySalesFilterOptions() {
  const db = getDb();
  const [products, mopTypes] = await Promise.all([
    db
      .selectDistinct({ product: dailySales.product })
      .from(dailySales)
      .orderBy(asc(dailySales.product)),
    db
      .selectDistinct({ mopType: dailySales.mopType })
      .from(dailySales)
      .orderBy(asc(dailySales.mopType)),
  ]);

  return {
    products: products.map((row) => row.product).filter(Boolean),
    mopTypes: mopTypes.map((row) => row.mopType).filter(Boolean),
  };
}

export async function getDailySalesReportPage({
  filters,
  page,
}: {
  filters: DailySalesFilters;
  page: number;
}): Promise<{
  rows: DailySalesReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  if (!filters.applied) {
    return {
      rows: [],
      total: 0,
      page: 1,
      pageSize: DAILY_SALES_PAGE_SIZE,
      totalPages: 1,
    };
  }

  const db = getDb();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const where = buildFilterWhere(filters);

  const [totalRow] = await db
    .select({ total: count() })
    .from(dailySales)
    .where(where);

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / DAILY_SALES_PAGE_SIZE));
  const pageClamped = Math.min(safePage, totalPages);

  const rows = await db
    .select(dailySalesSelect)
    .from(dailySales)
    .where(where)
    .orderBy(asc(dailySales.receiptNo))
    .limit(DAILY_SALES_PAGE_SIZE)
    .offset((pageClamped - 1) * DAILY_SALES_PAGE_SIZE);

  return {
    rows,
    total,
    page: pageClamped,
    pageSize: DAILY_SALES_PAGE_SIZE,
    totalPages,
  };
}

/** All rows matching filters (no pagination) for Excel export. */
export async function getDailySalesExportRows(
  filters: DailySalesFilters
): Promise<DailySalesReportRow[]> {
  if (!filters.applied) return [];

  const db = getDb();
  return db
    .select(dailySalesSelect)
    .from(dailySales)
    .where(buildFilterWhere(filters))
    .orderBy(asc(dailySales.receiptNo));
}
