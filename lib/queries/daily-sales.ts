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
import { addIstDays, parseIstDate } from "@/lib/date-range";
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

export type DailySalesMetricPoint = {
  date: string;
  label: string;
  amount: number;
  netAmount: number;
  volumeLitre: number;
  receipts: number;
};

const ANALYTICS_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function normalizeAnalyticsBounds(start: string, end: string) {
  if (start <= end) return { start, end };
  return { start: end, end: start };
}

function analyticsDateTimeWhere(startDateTime: string, endDateTime: string) {
  if (
    !ANALYTICS_DATETIME_RE.test(startDateTime) ||
    !ANALYTICS_DATETIME_RE.test(endDateTime)
  ) {
    return null;
  }

  const { start, end } = normalizeAnalyticsBounds(startDateTime, endDateTime);
  return {
    start,
    end,
    where: and(
      gte(
        dailySales.startDate,
        sql`${wallDateTimeToTimestamp(start, "start")}::timestamp`
      ),
      lte(
        dailySales.startDate,
        sql`${wallDateTimeToTimestamp(end, "end")}::timestamp`
      )
    ),
  };
}

export type DailySalesBreakdownPoint = {
  name: string;
  amount: number;
};

async function getDailySalesAmountBreakdown(
  startDateTime: string,
  endDateTime: string,
  dimension: "product" | "mopType"
): Promise<DailySalesBreakdownPoint[]> {
  const bounds = analyticsDateTimeWhere(startDateTime, endDateTime);
  if (!bounds) return [];

  const groupColumn =
    dimension === "product" ? dailySales.product : dailySales.mopType;
  const db = getDb();

  const rows = await db
    .select({
      name: groupColumn,
      amount: sql<string>`coalesce(sum(${dailySales.amount}), 0)`,
    })
    .from(dailySales)
    .where(bounds.where)
    .groupBy(groupColumn)
    .orderBy(sql`sum(${dailySales.amount}) desc`);

  return rows
    .filter((row) => row.name)
    .map((row) => ({
      name: row.name,
      amount: Number(row.amount),
    }));
}

export async function getDailySalesMetricsByProduct(
  startDateTime: string,
  endDateTime: string
): Promise<DailySalesBreakdownPoint[]> {
  return getDailySalesAmountBreakdown(startDateTime, endDateTime, "product");
}

export async function getDailySalesMetricsByMopType(
  startDateTime: string,
  endDateTime: string
): Promise<DailySalesBreakdownPoint[]> {
  return getDailySalesAmountBreakdown(startDateTime, endDateTime, "mopType");
}

/** Daily totals for amount / net / volume between inclusive datetime bounds (`yyyy-MM-ddTHH:mm`). */
export async function getDailySalesMetricsByDay(
  startDateTime: string,
  endDateTime: string
): Promise<DailySalesMetricPoint[]> {
  const bounds = analyticsDateTimeWhere(startDateTime, endDateTime);
  if (!bounds) return [];

  const { start, end, where } = bounds;
  const startDay = start.slice(0, 10);
  const endDay = end.slice(0, 10);

  const db = getDb();
  const dayExpr = sql<string>`to_char(date_trunc('day', ${dailySales.startDate}), 'YYYY-MM-DD')`;

  const rows = await db
    .select({
      date: dayExpr,
      amount: sql<string>`coalesce(sum(${dailySales.amount}), 0)`,
      netAmount: sql<string>`coalesce(sum(${dailySales.netAmount}), 0)`,
      volumeLitre: sql<string>`coalesce(sum(${dailySales.volumeLitre}), 0)`,
      receipts: count(),
    })
    .from(dailySales)
    .where(where)
    .groupBy(dayExpr)
    .orderBy(asc(dayExpr));

  const totals = new Map(
    rows.map((row) => [
      row.date,
      {
        amount: Number(row.amount),
        netAmount: Number(row.netAmount),
        volumeLitre: Number(row.volumeLitre),
        receipts: Number(row.receipts),
      },
    ])
  );

  const points: DailySalesMetricPoint[] = [];
  let current = startDay;
  while (current <= endDay) {
    const entry = totals.get(current) ?? {
      amount: 0,
      netAmount: 0,
      volumeLitre: 0,
      receipts: 0,
    };
    points.push({ date: current, ...entry, label: "" });
    current = addIstDays(current, 1);
  }

  const dayCount = points.length;
  return points.map((point) => ({
    ...point,
    label:
      dayCount <= 7
        ? parseIstDate(point.date).toLocaleDateString("en-IN", {
            weekday: "short",
            timeZone: "Asia/Kolkata",
          })
        : parseIstDate(point.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          }),
  }));
}
