import { Suspense } from "react";
import {
  SalesBreakdownPieChart,
  SalesMetricsChart,
  SalesMetricsLineChart,
} from "@/components/sales-data-analytics/analytics-charts-dynamic";
import { FootfallProductChartPanel } from "@/components/sales-data-analytics/footfall-product-chart-panel";
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
  getFootfallByAmountRangesTabular,
  getFootfallByHourOfDayTabular,
  getFootfallByPumpTabular,
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

function withoutProduct<T extends { product?: string }>(
  bounds: T
): Omit<T, "product"> {
  const { product: _product, ...rest } = bounds;
  return rest;
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
    ((metric === "footfall" || metric === "footfall-by-pump") &&
      Boolean(footfallBounds)) ||
    (metric === "footfall-by-price" && Boolean(footfallByPriceBounds));

  const filterOptions = needsProducts
    ? await getDailySalesFilterOptions(tenantId)
    : { products: [] as string[], mopTypes: [] as string[] };

  const product =
    selectedProduct && filterOptions.products.includes(selectedProduct)
      ? selectedProduct
      : undefined;

  const salesApplied = metric === "sales" && Boolean(start && end);
  const footfallBase = footfallBounds
    ? withoutProduct(footfallBounds)
    : null;
  const footfallByPriceBase = footfallByPriceBounds
    ? withoutProduct(footfallByPriceBounds)
    : null;

  const [
    footfallDataset,
    footfallByPriceDataset,
    footfallByPumpDataset,
    salesMetrics,
    productBreakdown,
    mopBreakdown,
  ] = await Promise.all([
    metric === "footfall" && footfallBase
      ? getFootfallByHourOfDayTabular(tenantId, footfallBase)
      : Promise.resolve(null),
    metric === "footfall-by-price" && footfallByPriceBase
      ? getFootfallByAmountRangesTabular(tenantId, footfallByPriceBase)
      : Promise.resolve(null),
    metric === "footfall-by-pump" && footfallBase
      ? getFootfallByPumpTabular(tenantId, footfallBase)
      : Promise.resolve(null),
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

  const salesChartData = salesMetrics.map(({ label, amount }) => ({
    label,
    amount,
  }));

  const tabProducts =
    filterOptions.products.length > 0
      ? filterOptions.products
      : Object.keys(
          footfallDataset?.byProduct ??
            footfallByPriceDataset?.byProduct ??
            footfallByPumpDataset?.byProduct ??
            {}
        ).sort();

  if (metric === "footfall" && footfallDataset) {
    return (
      <Suspense fallback={null}>
        <FootfallProductChartPanel
          title="Footfall"
          labelHeader="Hour"
          products={tabProducts}
          initialProduct={product}
          dataset={footfallDataset}
        />
      </Suspense>
    );
  }

  if (metric === "footfall-by-pump" && footfallByPumpDataset) {
    return (
      <Suspense fallback={null}>
        <FootfallProductChartPanel
          title="Footfall by pump"
          labelHeader="Pump"
          products={tabProducts}
          initialProduct={product}
          dataset={footfallByPumpDataset}
        />
      </Suspense>
    );
  }

  if (metric === "footfall-by-price" && footfallByPriceDataset) {
    return (
      <Suspense fallback={null}>
        <FootfallProductChartPanel
          title="Footfall by price"
          labelHeader="Price range"
          products={tabProducts}
          initialProduct={product}
          dataset={footfallByPriceDataset}
        />
      </Suspense>
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
