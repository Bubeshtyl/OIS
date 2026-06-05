import Link from "next/link";
import { Container, Droplet, Scale, SquareArrowUp } from "lucide-react";
import { DepotStockTable } from "@/components/dashboard/depot-stock-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickActionTiles } from "@/components/dashboard/quick-action-tiles";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { PageHeader } from "@/components/shared/page-blocks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { canWriteInventory } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import {
  formatLitres,
  formatPackets,
  formatSignedPackets,
  formatStockAvailability,
} from "@/lib/format";
import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import {
  getActivityForRange,
  getDailySummary,
  getLowStockAlerts,
  getProductActivityForRange,
  getRecentTransactions,
  getSalesForDateRange,
  getStockSummary,
} from "@/lib/queries/inventory";
import { getIstTodayString } from "@/lib/timezone";

export const dynamic = "force-dynamic";

function buildSparkline(
  daily: Array<{ received: number; transferred: number; sold: number }>,
  pick: (row: { received: number; transferred: number; sold: number }) => number
) {
  const points = daily.map(pick);
  return points.length > 1 ? points : undefined;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(params.start) ? params.start : defaultStart,
    isValidDateString(params.end) ? params.end : defaultEnd
  );
  const [stock, activity, chartData, recent, productActivity, daily, lowStock] =
    await Promise.all([
      getStockSummary(),
      getActivityForRange(start, end),
      getSalesForDateRange(start, end),
      getRecentTransactions(undefined, 6, { startDate: start, endDate: end }),
      getProductActivityForRange(start, end),
      getDailySummary(start, end),
      getLowStockAlerts(),
    ]);

  const dailyAsc = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const consumptionSparkline = chartData.map((d) => d.quantity);
  const issuedSparkline = buildSparkline(dailyAsc, (d) => d.transferred);
  const receivedSparkline = buildSparkline(dailyAsc, (d) => d.received);
  const varianceSparkline = buildSparkline(
    dailyAsc,
    (d) => d.received - d.transferred
  );

  const variancePackets =
    activity.receivePackets -
    activity.transferPackets -
    stock.depotPackets;
  const oilTypeCount = stock.products.length;
  const rangeSubtitle = "In selected range";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of oil inventory and movement"
        />
        <PageToolbar
          name={session.name}
          role={session.role}
          startDate={start}
          endDate={end}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Depot Stock"
          value={formatPackets(stock.depotPackets)}
          subtitle={
            oilTypeCount === 1
              ? `${formatLitres(stock.depotQty)} · 1 oil type`
              : `${formatLitres(stock.depotQty)} · ${oilTypeCount} oil types`
          }
          icon={Container}
          iconClassName="bg-emerald-100 text-emerald-700"
          sparkline={receivedSparkline}
          sparklineColor="#16a34a"
        />
        <KpiCard
          label="Total Issued to Managers"
          value={formatPackets(activity.transferPackets)}
          subtitle={`${formatLitres(activity.transferQty)} · ${rangeSubtitle.toLowerCase()}`}
          icon={SquareArrowUp}
          iconClassName="bg-sky-100 text-sky-700"
          sparkline={issuedSparkline}
          sparklineColor="#0284c7"
        />
        <KpiCard
          label="Total Consumption"
          value={formatPackets(activity.salePackets)}
          subtitle={`${formatLitres(activity.saleQty)} · ${rangeSubtitle.toLowerCase()}`}
          icon={Droplet}
          iconClassName="bg-orange-100 text-orange-700"
          sparkline={
            consumptionSparkline.length > 1 ? consumptionSparkline : undefined
          }
          sparklineColor="#ea580c"
        />
        <KpiCard
          label="Variance (Depot)"
          value={formatSignedPackets(variancePackets)}
          subtitle={variancePackets !== 0 ? "Needs attention" : "Balanced"}
          icon={Scale}
          iconClassName="bg-red-100 text-red-700"
          sparkline={varianceSparkline}
          sparklineColor="#dc2626"
          valueClassName={variancePackets < 0 ? "text-red-600" : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-0 shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>Depot Stock Summary</CardTitle>
            <CardDescription>
              Received and issued are for the selected date range. Balance is
              current stock at depot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DepotStockTable
              products={stock.products}
              productActivity={productActivity}
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentTransactions rows={recent} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Consumption in range (packets)</CardTitle>
            <Link
              href="/reports?tab=sales"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <SalesChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All products are above threshold.
              </p>
            ) : (
              lowStock.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50">
                      <Container className="size-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatStockAvailability(item.manager, {
                          volumePerPacket: item.volumePerPacket,
                          unit: item.unit,
                        })}{" "}
                        at Manager
                        {item.lowStockThreshold != null
                          ? ` · alert at ${formatLitres(item.lowStockThreshold)}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.depot > 0
                          ? `${formatStockAvailability(item.depot, {
                              volumePerPacket: item.volumePerPacket,
                              unit: item.unit,
                            })} pending at Depot`
                          : "No stock pending at Depot"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                    Low
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {canWriteInventory(session.role) && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Quick Actions</h2>
          <QuickActionTiles />
        </div>
      )}
    </div>
  );
}
