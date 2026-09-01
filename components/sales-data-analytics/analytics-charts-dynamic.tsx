"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const chartFallback = <Skeleton className="h-72 w-full rounded-xl" />;

export const FootfallMetricsChart = dynamic(
  () =>
    import("@/components/sales-data-analytics/footfall-metrics-chart").then(
      (mod) => mod.FootfallMetricsChart
    ),
  { loading: () => chartFallback }
);

export const SalesBreakdownPieChart = dynamic(
  () =>
    import("@/components/sales-data-analytics/sales-breakdown-pie-chart").then(
      (mod) => mod.SalesBreakdownPieChart
    ),
  { loading: () => chartFallback }
);

export const SalesMetricsChart = dynamic(
  () =>
    import("@/components/sales-data-analytics/sales-metrics-chart").then(
      (mod) => mod.SalesMetricsChart
    ),
  { loading: () => chartFallback }
);

export const SalesMetricsLineChart = dynamic(
  () =>
    import("@/components/sales-data-analytics/sales-metrics-line-chart").then(
      (mod) => mod.SalesMetricsLineChart
    ),
  { loading: () => chartFallback }
);
