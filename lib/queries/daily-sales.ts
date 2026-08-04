import {
  and,
  asc,
  count,
  desc,
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
import {
  enumeratePeriodBuckets,
  labelPeriodBucket,
  type AnalyticsGranularity,
} from "@/lib/daily-sales/analytics-period";
import {
  formatAmountRangeLabel,
  formatHourLabel,
  type FootfallByPriceBounds,
  type FootfallFilterBounds,
} from "@/lib/daily-sales/footfall-filters";
import { getDb } from "@/lib/db";
import { dailySales, dailySalesUploads, users } from "@/lib/db/schema";

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

function buildFilterWhere(
  tenantId: string,
  filters: DailySalesFilters
): SQL | undefined {
  const parts: SQL[] = [eq(dailySales.tenantId, tenantId)];

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

export async function getDailySalesFilterOptions(tenantId: string) {
  const db = getDb();
  const [products, mopTypes] = await Promise.all([
    db
      .selectDistinct({ product: dailySales.product })
      .from(dailySales)
      .where(eq(dailySales.tenantId, tenantId))
      .orderBy(asc(dailySales.product)),
    db
      .selectDistinct({ mopType: dailySales.mopType })
      .from(dailySales)
      .where(eq(dailySales.tenantId, tenantId))
      .orderBy(asc(dailySales.mopType)),
  ]);

  return {
    products: products.map((row) => row.product).filter(Boolean),
    mopTypes: mopTypes.map((row) => row.mopType).filter(Boolean),
  };
}

export async function getDailySalesReportPage({
  tenantId,
  filters,
  page,
}: {
  tenantId: string;
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
  const where = buildFilterWhere(tenantId, filters);

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
  tenantId: string,
  filters: DailySalesFilters
): Promise<DailySalesReportRow[]> {
  if (!filters.applied) return [];

  const db = getDb();
  return db
    .select(dailySalesSelect)
    .from(dailySales)
    .where(buildFilterWhere(tenantId, filters))
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

export type FootfallMetricPoint = {
  date: string;
  label: string;
  count: number;
};

export type FootfallHourPoint = {
  hour: number;
  label: string;
  count: number;
};

const ANALYTICS_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function normalizeAnalyticsBounds(start: string, end: string) {
  if (start <= end) return { start, end };
  return { start: end, end: start };
}

function analyticsDateTimeWhere(
  tenantId: string,
  startDateTime: string,
  endDateTime: string
) {
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
      eq(dailySales.tenantId, tenantId),
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
  tenantId: string,
  startDateTime: string,
  endDateTime: string,
  dimension: "product" | "mopType"
): Promise<DailySalesBreakdownPoint[]> {
  const bounds = analyticsDateTimeWhere(tenantId, startDateTime, endDateTime);
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
  tenantId: string,
  startDateTime: string,
  endDateTime: string
): Promise<DailySalesBreakdownPoint[]> {
  return getDailySalesAmountBreakdown(
    tenantId,
    startDateTime,
    endDateTime,
    "product"
  );
}

export async function getDailySalesMetricsByMopType(
  tenantId: string,
  startDateTime: string,
  endDateTime: string
): Promise<DailySalesBreakdownPoint[]> {
  return getDailySalesAmountBreakdown(
    tenantId,
    startDateTime,
    endDateTime,
    "mopType"
  );
}

function periodBucketExpr(granularity: AnalyticsGranularity) {
  switch (granularity) {
    case "hour":
      return sql<string>`to_char(date_trunc('hour', ${dailySales.startDate}), 'YYYY-MM-DD"T"HH24:00')`;
    case "day":
      return sql<string>`to_char(date_trunc('day', ${dailySales.startDate}), 'YYYY-MM-DD')`;
    case "week":
      return sql<string>`to_char(date_trunc('week', ${dailySales.startDate}), 'YYYY-MM-DD')`;
    case "month":
      return sql<string>`to_char(date_trunc('month', ${dailySales.startDate}), 'YYYY-MM')`;
    case "year":
      return sql<string>`to_char(date_trunc('year', ${dailySales.startDate}), 'YYYY')`;
  }
}

/** Period totals for amount / net / volume between inclusive datetime bounds (`yyyy-MM-ddTHH:mm`). */
export async function getDailySalesMetricsByPeriod(
  tenantId: string,
  startDateTime: string,
  endDateTime: string,
  granularity: AnalyticsGranularity
): Promise<DailySalesMetricPoint[]> {
  const bounds = analyticsDateTimeWhere(tenantId, startDateTime, endDateTime);
  if (!bounds) return [];

  const { start, end, where } = bounds;
  const db = getDb();
  const bucketExpr = periodBucketExpr(granularity);

  const rows = await db
    .select({
      date: bucketExpr,
      amount: sql<string>`coalesce(sum(${dailySales.amount}), 0)`,
      netAmount: sql<string>`coalesce(sum(${dailySales.netAmount}), 0)`,
      volumeLitre: sql<string>`coalesce(sum(${dailySales.volumeLitre}), 0)`,
      receipts: count(),
    })
    .from(dailySales)
    .where(where)
    .groupBy(bucketExpr)
    .orderBy(asc(bucketExpr));

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

  const buckets = enumeratePeriodBuckets(start, end, granularity);
  const points = buckets.map((key) => {
    const entry = totals.get(key) ?? {
      amount: 0,
      netAmount: 0,
      volumeLitre: 0,
      receipts: 0,
    };
    return { date: key, ...entry, label: "" };
  });

  return points.map((point) => ({
    ...point,
    label: labelPeriodBucket(point.date, granularity, points.length),
  }));
}

/** Footfall = receipt count, bucketed by period. */
export async function getFootfallMetricsByPeriod(
  tenantId: string,
  startDateTime: string,
  endDateTime: string,
  granularity: AnalyticsGranularity
): Promise<FootfallMetricPoint[]> {
  const bounds = analyticsDateTimeWhere(tenantId, startDateTime, endDateTime);
  if (!bounds) return [];

  const { start, end, where } = bounds;
  const db = getDb();
  const bucketExpr = periodBucketExpr(granularity);

  const rows = await db
    .select({
      date: bucketExpr,
      count: count(),
    })
    .from(dailySales)
    .where(where)
    .groupBy(bucketExpr)
    .orderBy(asc(bucketExpr));

  const totals = new Map(rows.map((row) => [row.date, Number(row.count)]));
  const buckets = enumeratePeriodBuckets(start, end, granularity);
  const points = buckets.map((key) => ({
    date: key,
    count: totals.get(key) ?? 0,
    label: "",
  }));

  return points.map((point) => ({
    ...point,
    label: labelPeriodBucket(point.date, granularity, points.length),
  }));
}

/**
 * Footfall by clock hour across a date range, applying the same daily time window
 * on each day (not one continuous datetime span).
 */
export async function getFootfallByHourOfDay(
  tenantId: string,
  bounds: FootfallFilterBounds
): Promise<FootfallHourPoint[]> {
  const {
    startDate,
    endDate,
    startHour,
    endHour,
    product,
  } = bounds;

  const db = getDb();
  const hourExpr = sql<number>`extract(hour from ${dailySales.startDate})::int`;

  const parts: SQL[] = [
    eq(dailySales.tenantId, tenantId),
    sql`to_char(${dailySales.startDate}, 'YYYY-MM-DD') >= ${startDate}`,
    sql`to_char(${dailySales.startDate}, 'YYYY-MM-DD') <= ${endDate}`,
    sql`extract(hour from ${dailySales.startDate})::int >= ${startHour}`,
    sql`extract(hour from ${dailySales.startDate})::int <= ${endHour}`,
  ];
  if (product) {
    parts.push(eq(dailySales.product, product));
  }

  const rows = await db
    .select({
      hour: hourExpr,
      count: count(),
    })
    .from(dailySales)
    .where(and(...parts))
    .groupBy(hourExpr)
    .orderBy(asc(hourExpr));

  const totals = new Map(rows.map((row) => [Number(row.hour), Number(row.count)]));
  const points: FootfallHourPoint[] = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    points.push({
      hour,
      label: formatHourLabel(hour),
      count: totals.get(hour) ?? 0,
    });
  }
  return points;
}

export type FootfallAmountRangePoint = {
  min: number;
  max: number;
  label: string;
  count: number;
};

/**
 * Footfall counts bucketed by user-defined net_amount ranges
 * (min inclusive, max exclusive), within a calendar date span.
 */
export async function getFootfallByAmountRanges(
  tenantId: string,
  bounds: FootfallByPriceBounds
): Promise<FootfallAmountRangePoint[]> {
  const { startDate, endDate, ranges, product } = bounds;
  if (ranges.length === 0) return [];

  const db = getDb();
  const parts: SQL[] = [
    eq(dailySales.tenantId, tenantId),
    sql`to_char(${dailySales.startDate}, 'YYYY-MM-DD') >= ${startDate}`,
    sql`to_char(${dailySales.startDate}, 'YYYY-MM-DD') <= ${endDate}`,
  ];
  if (product) {
    parts.push(eq(dailySales.product, product));
  }

  const selectFields = Object.fromEntries(
    ranges.map((range, index) => [
      `r${index}`,
      sql<string>`count(*) filter (where ${dailySales.netAmount} >= ${String(range.min)} and ${dailySales.netAmount} < ${String(range.max)})`,
    ])
  ) as Record<string, SQL<string>>;

  const [row] = await db
    .select(selectFields)
    .from(dailySales)
    .where(and(...parts));

  return ranges.map((range, index) => ({
    min: range.min,
    max: range.max,
    label: formatAmountRangeLabel(range),
    count: Number(row?.[`r${index}`] ?? 0),
  }));
}

/** Daily totals for amount / net / volume between inclusive datetime bounds (`yyyy-MM-ddTHH:mm`). */
export async function getDailySalesMetricsByDay(
  tenantId: string,
  startDateTime: string,
  endDateTime: string
): Promise<DailySalesMetricPoint[]> {
  return getDailySalesMetricsByPeriod(tenantId, startDateTime, endDateTime, "day");
}

export type RecentDailySalesUpload = {
  id: string;
  fileName: string;
  uploadedByName: string | null;
  inserted: number;
  updated: number;
  total: number;
  skipped: number;
  createdAt: Date;
};

export async function recordDailySalesUpload(input: {
  tenantId: string;
  fileName: string;
  uploadedBy: string | null;
  inserted: number;
  updated: number;
  total: number;
  skipped: number;
}) {
  const db = getDb();
  const [row] = await db
    .insert(dailySalesUploads)
    .values({
      tenantId: input.tenantId,
      fileName: input.fileName,
      uploadedBy: input.uploadedBy,
      inserted: input.inserted,
      updated: input.updated,
      total: input.total,
      skipped: input.skipped,
    })
    .returning({ id: dailySalesUploads.id });
  return row;
}

export async function getRecentDailySalesUploads(
  tenantId: string,
  limit = 5
): Promise<RecentDailySalesUpload[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: dailySalesUploads.id,
      fileName: dailySalesUploads.fileName,
      uploadedByName: users.name,
      inserted: dailySalesUploads.inserted,
      updated: dailySalesUploads.updated,
      total: dailySalesUploads.total,
      skipped: dailySalesUploads.skipped,
      createdAt: dailySalesUploads.createdAt,
    })
    .from(dailySalesUploads)
    .leftJoin(users, eq(dailySalesUploads.uploadedBy, users.id))
    .where(eq(dailySalesUploads.tenantId, tenantId))
    .orderBy(desc(dailySalesUploads.createdAt))
    .limit(limit);

  return rows;
}
