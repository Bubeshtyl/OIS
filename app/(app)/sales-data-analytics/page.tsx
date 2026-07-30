import { SalesAnalyticsFilters } from "@/components/sales-data-analytics/sales-analytics-filters";
import { SalesBreakdownPieChart } from "@/components/sales-data-analytics/sales-breakdown-pie-chart";
import { SalesMetricsChart } from "@/components/sales-data-analytics/sales-metrics-chart";
import { SalesMetricsLineChart } from "@/components/sales-data-analytics/sales-metrics-line-chart";
import { PageHeader } from "@/components/shared/page-blocks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getDailySalesMetricsByDay,
  getDailySalesMetricsByMopType,
  getDailySalesMetricsByProduct,
} from "@/lib/queries/daily-sales";

export const dynamic = "force-dynamic";

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export default async function SalesDataAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const start =
    params.start && DATETIME_RE.test(params.start) ? params.start : undefined;
  const end =
    params.end && DATETIME_RE.test(params.end) ? params.end : undefined;
  const applied = Boolean(start && end);

  const [metrics, productBreakdown, mopBreakdown] = applied
    ? await Promise.all([
        getDailySalesMetricsByDay(start!, end!),
        getDailySalesMetricsByProduct(start!, end!),
        getDailySalesMetricsByMopType(start!, end!),
      ])
    : [[], [], []];

  const chartData = metrics.map(({ label, amount }) => ({ label, amount }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Data Analytics"
        subtitle="Explore and analyze daily sales performance"
      />

      <SalesAnalyticsFilters initialStart={start} initialEnd={end} />

      {applied ? (
        <>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesMetricsChart data={chartData} />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Sales trend</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesMetricsLineChart data={chartData} />
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
      ) : (
        <p className="text-sm text-muted-foreground">
          Choose a start and end date &amp; time, then Apply to load the sales
          chart.
        </p>
      )}
    </div>
  );
}
