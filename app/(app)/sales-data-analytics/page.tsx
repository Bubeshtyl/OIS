import { Suspense } from "react";
import { FootfallMetricsChart } from "@/components/sales-data-analytics/footfall-metrics-chart";
import { FootfallProductTabs } from "@/components/sales-data-analytics/footfall-product-tabs";
import { SalesAnalyticsFilters } from "@/components/sales-data-analytics/sales-analytics-filters";
import { SalesBreakdownPieChart } from "@/components/sales-data-analytics/sales-breakdown-pie-chart";
import { SalesGranularityTabs } from "@/components/sales-data-analytics/sales-granularity-tabs";
import { SalesMetricsChart } from "@/components/sales-data-analytics/sales-metrics-chart";
import { SalesMetricsLineChart } from "@/components/sales-data-analytics/sales-metrics-line-chart";
import { PageHeader } from "@/components/shared/page-blocks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTenantSession } from "@/lib/auth/permissions";
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
import {
  getDailySalesFilterOptions,
  getDailySalesMetricsByMopType,
  getDailySalesMetricsByPeriod,
  getDailySalesMetricsByProduct,
  getFootfallByAmountRanges,
  getFootfallByHourOfDay,
} from "@/lib/queries/daily-sales";

export const dynamic = "force-dynamic";

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

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
  const session = await requireTenantSession();
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
    metric === "footfall"
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
  const footfallApplied = Boolean(footfallBounds);
  const footfallByPriceApplied = Boolean(footfallByPriceBounds);
  const applied =
    metric === "footfall"
      ? footfallApplied
      : metric === "footfall-by-price"
        ? footfallByPriceApplied
        : salesApplied;

  const needsProducts =
    (metric === "footfall" && footfallApplied) ||
    (metric === "footfall-by-price" && footfallByPriceApplied);

  const filterOptions = needsProducts
    ? await getDailySalesFilterOptions(session.tenantId)
    : { products: [] as string[], mopTypes: [] as string[] };

  const selectedProduct =
    product && filterOptions.products.includes(product) ? product : undefined;

  const [
    footfallMetrics,
    footfallByPriceMetrics,
    salesMetrics,
    productBreakdown,
    mopBreakdown,
  ] = applied
    ? await Promise.all([
        footfallBounds
          ? getFootfallByHourOfDay(session.tenantId, {
              ...footfallBounds,
              product: selectedProduct,
            })
          : Promise.resolve([]),
        footfallByPriceBounds
          ? getFootfallByAmountRanges(session.tenantId, {
              ...footfallByPriceBounds,
              product: selectedProduct,
            })
          : Promise.resolve([]),
        salesApplied
          ? getDailySalesMetricsByPeriod(
              session.tenantId,
              start!,
              end!,
              granularity
            )
          : Promise.resolve([]),
        salesApplied
          ? getDailySalesMetricsByProduct(session.tenantId, start!, end!)
          : Promise.resolve([]),
        salesApplied
          ? getDailySalesMetricsByMopType(session.tenantId, start!, end!)
          : Promise.resolve([]),
      ])
    : [[], [], [], [], []];

  const footfallChartData = footfallMetrics.map(({ label, count }) => ({
    label,
    count,
  }));
  const footfallByPriceChartData = footfallByPriceMetrics.map(
    ({ label, count }) => ({
      label,
      count,
    })
  );
  const salesChartData = salesMetrics.map(({ label, amount }) => ({
    label,
    amount,
  }));

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

      {applied ? (
        metric === "footfall" ? (
          <>
            <Suspense fallback={null}>
              <FootfallProductTabs
                products={filterOptions.products}
                product={selectedProduct}
              />
            </Suspense>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Footfall</CardTitle>
              </CardHeader>
              <CardContent>
                <FootfallMetricsChart data={footfallChartData} />
              </CardContent>
            </Card>
          </>
        ) : metric === "footfall-by-price" ? (
          <>
            <Suspense fallback={null}>
              <FootfallProductTabs
                products={filterOptions.products}
                product={selectedProduct}
              />
            </Suspense>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Footfall by price</CardTitle>
              </CardHeader>
              <CardContent>
                <FootfallMetricsChart data={footfallByPriceChartData} />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Suspense fallback={null}>
              <SalesGranularityTabs granularity={granularity} />
            </Suspense>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <SalesMetricsChart data={salesChartData} />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Sales trend</CardTitle>
              </CardHeader>
              <CardContent>
                <SalesMetricsLineChart data={salesChartData} />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Product sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesBreakdownPieChart data={productBreakdown} />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>MOP type</CardTitle>
                </CardHeader>
                <CardContent>
                  <SalesBreakdownPieChart data={mopBreakdown} />
                </CardContent>
              </Card>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}
