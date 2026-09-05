import { Suspense } from "react";
import {
  FootfallMetricsChart,
  SalesBreakdownPieChart,
  SalesMetricsChart,
  SalesMetricsLineChart,
} from "@/components/sales-data-analytics/analytics-charts-dynamic";
import { FootfallMetricsTable } from "@/components/sales-data-analytics/footfall-metrics-table";
import { FootfallProductTabs } from "@/components/sales-data-analytics/footfall-product-tabs";
import { SalesGranularityTabs } from "@/components/sales-data-analytics/sales-granularity-tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsGranularity, AnalyticsMetric } from "@/lib/daily-sales/analytics-period";
import {
  getDailySalesFilterOptions,
  getDailySalesMetricsByMopType,
  getDailySalesMetricsByPeriod,
  getDailySalesMetricsByProduct,
  getFootfallByAmountRanges,
  getFootfallByHourOfDay,
} from "@/lib/queries/daily-sales";
import type {
  FootfallByPriceBounds,
  FootfallFilterBounds,
} from "@/lib/daily-sales/footfall-filters";

export function AnalyticsChartsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

export async function AnalyticsChartsContent({
  tenantId,
  metric,
  start,
  end,
  granularity,
  footfallBounds,
  footfallByPriceBounds,
  selectedProduct,
  applied,
}: {
  tenantId: string;
  metric: AnalyticsMetric;
  start?: string;
  end?: string;
  granularity: AnalyticsGranularity;
  footfallBounds: FootfallFilterBounds | null;
  footfallByPriceBounds: FootfallByPriceBounds | null;
  selectedProduct?: string;
  applied: boolean;
}) {
  if (!applied) return null;

  const needsProducts =
    (metric === "footfall" && Boolean(footfallBounds)) ||
    (metric === "footfall-by-price" && Boolean(footfallByPriceBounds));

  const filterOptions = needsProducts
    ? await getDailySalesFilterOptions(tenantId)
    : { products: [] as string[], mopTypes: [] as string[] };

  const product =
    selectedProduct && filterOptions.products.includes(selectedProduct)
      ? selectedProduct
      : undefined;

  const salesApplied = metric === "sales" && Boolean(start && end);

  const [
    footfallMetrics,
    footfallByPriceMetrics,
    salesMetrics,
    productBreakdown,
    mopBreakdown,
  ] = await Promise.all([
    footfallBounds
      ? getFootfallByHourOfDay(tenantId, {
          ...footfallBounds,
          product,
        })
      : Promise.resolve([]),
    footfallByPriceBounds
      ? getFootfallByAmountRanges(tenantId, {
          ...footfallByPriceBounds,
          product,
        })
      : Promise.resolve([]),
    salesApplied
      ? getDailySalesMetricsByPeriod(tenantId, start!, end!, granularity)
      : Promise.resolve([]),
    salesApplied
      ? getDailySalesMetricsByProduct(tenantId, start!, end!)
      : Promise.resolve([]),
    salesApplied
      ? getDailySalesMetricsByMopType(tenantId, start!, end!)
      : Promise.resolve([]),
  ]);

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

  if (metric === "footfall") {
    return (
      <>
        <Suspense fallback={null}>
          <FootfallProductTabs
            products={filterOptions.products}
            product={product}
          />
        </Suspense>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Footfall</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FootfallMetricsChart data={footfallChartData} />
            <FootfallMetricsTable data={footfallChartData} labelHeader="Hour" />
          </CardContent>
        </Card>
      </>
    );
  }

  if (metric === "footfall-by-price") {
    return (
      <>
        <Suspense fallback={null}>
          <FootfallProductTabs
            products={filterOptions.products}
            product={product}
          />
        </Suspense>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Footfall by price</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FootfallMetricsChart data={footfallByPriceChartData} />
            <FootfallMetricsTable
              data={footfallByPriceChartData}
              labelHeader="Price range"
            />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
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
  );
}
