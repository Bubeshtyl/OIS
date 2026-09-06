import { Suspense } from "react";
import {
  AnalyticsChartsContent,
  AnalyticsChartsSkeleton,
} from "@/components/sales-data-analytics/analytics-charts-content";
import { SalesAnalyticsFilters } from "@/components/sales-data-analytics/sales-analytics-filters";
import { PageHeader } from "@/components/shared/page-blocks";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  parseAnalyticsGranularity,
  parseAnalyticsMetric,
} from "@/lib/daily-sales/analytics-period";
import {
  DEFAULT_FOOTFALL_END_TIME,
  DEFAULT_FOOTFALL_START_TIME,
  parseFootfallByPriceBounds,
  parseFootfallFilterBounds,
  parseTimeParam,
  parseDateParam,
} from "@/lib/daily-sales/footfall-filters";

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

async function AnalyticsChartsGate({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    metric?: string;
    granularity?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    product?: string;
    ranges?: string;
  }>;
}) {
  const session = await requireTenantSession();
  await requirePermission(session, "sales-data-analytics:read");
  const params = await searchParams;
  const metric = parseAnalyticsMetric(params.metric);

  const start =
    params.start && DATETIME_RE.test(params.start) ? params.start : undefined;
  const end =
    params.end && DATETIME_RE.test(params.end) ? params.end : undefined;
  const granularity = parseAnalyticsGranularity(params.granularity);

  const startDate = parseDateParam(params.startDate);
  const endDate = parseDateParam(params.endDate);
  const startTime = parseTimeParam(
    params.startTime,
    DEFAULT_FOOTFALL_START_TIME
  );
  const endTime = parseTimeParam(params.endTime, DEFAULT_FOOTFALL_END_TIME);
  const product = params.product?.trim() || undefined;

  const footfallBounds =
    metric === "footfall" || metric === "footfall-by-pump"
      ? parseFootfallFilterBounds({
          startDate,
          endDate,
          startTime,
          endTime,
          product,
        })
      : null;

  const footfallByPriceBounds =
    metric === "footfall-by-price"
      ? parseFootfallByPriceBounds({
          startDate,
          endDate,
          ranges: params.ranges,
          product,
        })
      : null;

  const salesApplied = metric === "sales" && Boolean(start && end);
  const applied =
    metric === "footfall" || metric === "footfall-by-pump"
      ? Boolean(footfallBounds)
      : metric === "footfall-by-price"
        ? Boolean(footfallByPriceBounds)
        : salesApplied;

  return (
    <AnalyticsChartsContent
      tenantId={session.tenantId}
      metric={metric}
      start={start}
      end={end}
      granularity={granularity}
      footfallBounds={footfallBounds}
      footfallByPriceBounds={footfallByPriceBounds}
      selectedProduct={product}
      applied={applied}
    />
  );
}

export default async function SalesDataAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    metric?: string;
    granularity?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    product?: string;
    ranges?: string;
  }>;
}) {
  const params = await searchParams;
  const metric = parseAnalyticsMetric(params.metric);
  const start =
    params.start && DATETIME_RE.test(params.start) ? params.start : undefined;
  const end =
    params.end && DATETIME_RE.test(params.end) ? params.end : undefined;
  const startDate = parseDateParam(params.startDate);
  const endDate = parseDateParam(params.endDate);
  const chartsKey = [
    metric,
    start ?? "",
    end ?? "",
    startDate ?? "",
    endDate ?? "",
    params.startTime ?? "",
    params.endTime ?? "",
    params.ranges ?? "",
    params.granularity ?? "",
  ].join("|");

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Data Analytics" />

      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading filters…</div>
        }
      >
        <SalesAnalyticsFilters
          initialMetric={metric}
          initialStart={start}
          initialEnd={end}
          initialStartDate={startDate}
          initialEndDate={endDate}
          initialStartTime={params.startTime}
          initialEndTime={params.endTime}
          initialRanges={params.ranges}
        />
      </Suspense>

      <Suspense key={chartsKey} fallback={<AnalyticsChartsSkeleton />}>
        <AnalyticsChartsGate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
