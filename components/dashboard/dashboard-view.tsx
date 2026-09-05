"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, use } from "react";
import { Container, Droplet, Scale, SquareArrowUp } from "lucide-react";
import {
  DashboardLocationTabs,
  type DashboardLocation,
} from "@/components/dashboard/dashboard-location-tabs";
import { StockSummaryTable } from "@/components/dashboard/stock-summary-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickActionTiles } from "@/components/dashboard/quick-action-tiles";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { Skeleton } from "@/components/ui/skeleton";
import { StockUnitToggle } from "@/components/shared/stock-unit-toggle";
import { useStockDisplayUnit } from "@/components/shared/use-stock-display-unit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatSignedStockQuantity,
  formatStockQuantity,
  type StockDisplayUnit,
} from "@/lib/format";

const SalesChart = dynamic(
  () =>
    import("@/components/dashboard/sales-chart").then((mod) => mod.SalesChart),
  {
    loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
  }
);

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  depot: number;
  manager: number;
  depotPackets: number;
  managerPackets: number;
  volumePerPacket: string | number | null;
  lowStockThreshold: number | null;
};

type PeriodRow = {
  received: number;
  issued: number;
  returned: number;
  consumed: number;
  damaged: number;
  receivedPackets: number;
  issuedPackets: number;
  returnedPackets: number;
  consumedPackets: number;
  damagedPackets: number;
};

type RecentRow = {
  id: string;
  type:
    | "RECEIVE"
    | "TRANSFER"
    | "SALE"
    | "RETURNED"
    | "DAMAGED"
    | "REVERSAL";
  productName: string;
  quantity: string;
  unit: string;
  transactionDate: string;
  createdAt: Date;
  referenceNote?: string | null;
  packetsPerBox?: string | null;
  volumePerPacket?: string | null;
};

type ChartRow = { label: string; quantity: number; litres?: number };

function RecentPanel({
  promise,
  unit,
}: {
  promise: Promise<RecentRow[]>;
  unit: StockDisplayUnit;
}) {
  const recent = use(promise);
  return <RecentTransactions rows={recent} unit={unit} />;
}

function ChartPanel({
  promise,
  unit,
}: {
  promise: Promise<
    Array<{ label: string; quantity: number; litres?: number; packets?: number }>
  >;
  unit: StockDisplayUnit;
}) {
  const chartData = use(promise);
  const data: ChartRow[] = chartData.map((d) => ({
    label: d.label,
    quantity: d.quantity,
    litres: d.litres,
  }));
  return <SalesChart data={data} unit={unit} />;
}

function LowStockPanel({
  promise,
  location,
  unit,
}: {
  promise: Promise<ProductRow[]>;
  location: DashboardLocation;
  unit: StockDisplayUnit;
}) {
  const lowStock = use(promise);

  if (location === "depot") {
    return (
      <p className="text-sm text-muted-foreground">
        Low stock alerts apply to manager balances. Switch to Manager or All to
        view.
      </p>
    );
  }

  if (lowStock.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All products are above threshold.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {lowStock.map((item) => (
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
                {formatStockQuantity(
                  unit,
                  item.managerPackets,
                  item.manager
                )}{" "}
                at Manager
                {item.lowStockThreshold != null
                  ? ` · alert at ${formatStockQuantity(
                      unit,
                      item.lowStockThreshold,
                      item.lowStockThreshold *
                        Number(item.volumePerPacket ?? 0)
                    )}`
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.depot > 0
                  ? `${formatStockQuantity(
                      unit,
                      item.depotPackets,
                      item.depot
                    )} pending at Depot`
                  : "No stock pending at Depot"}
              </p>
            </div>
          </div>
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            Low
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function DashboardView({
  location,
  unit: initialUnit = "packets",
  canWrite,
  stockKpi,
  varianceKpi,
  activity,
  oilTypeCount,
  rangeSubtitle,
  stockCountHref,
  stockSummaryTitle,
  stockSummaryDescription,
  products,
  productActivity,
  recentPromise,
  chartPromise,
  lowStockPromise,
  receivedSparkline,
  issuedSparkline,
  consumptionSparkline,
  varianceSparkline,
}: {
  location: DashboardLocation;
  unit?: StockDisplayUnit;
  canWrite: boolean;
  stockKpi: { label: string; packets: number; litres: number };
  varianceKpi: { label: string; packets: number; litres: number };
  activity: {
    transferPackets: number;
    transferQty: number;
    salePackets: number;
    saleQty: number;
  };
  oilTypeCount: number;
  rangeSubtitle: string;
  stockCountHref: string;
  stockSummaryTitle: string;
  stockSummaryDescription: string;
  products: ProductRow[];
  productActivity: Record<string, PeriodRow>;
  recentPromise: Promise<RecentRow[]>;
  chartPromise: Promise<
    Array<{ label: string; quantity: number; litres?: number; packets?: number }>
  >;
  lowStockPromise: Promise<ProductRow[]>;
  receivedSparkline?: number[];
  issuedSparkline?: number[];
  consumptionSparkline?: number[];
  varianceSparkline?: number[];
}) {
  const { unit: displayUnit, setDisplayUnit } = useStockDisplayUnit(initialUnit);
  const oilTypeLabel =
    oilTypeCount === 1 ? "1 oil type" : `${oilTypeCount} oil types`;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <DashboardLocationTabs
          location={location}
          className="min-w-0 flex-1 sm:max-w-md"
        />
        <StockUnitToggle
          unit={displayUnit}
          onChange={setDisplayUnit}
          className="h-9 w-full min-w-0 shrink-0 rounded-lg p-1 sm:w-[8.75rem]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={stockKpi.label}
          value={formatStockQuantity(
            displayUnit,
            stockKpi.packets,
            stockKpi.litres
          )}
          subtitle={oilTypeLabel}
          icon={Container}
          iconClassName="bg-emerald-100 text-emerald-700"
          sparkline={receivedSparkline}
          sparklineColor="#93c572"
        />
        <KpiCard
          label="Total Issued to Managers"
          value={formatStockQuantity(
            displayUnit,
            activity.transferPackets,
            activity.transferQty
          )}
          subtitle={rangeSubtitle.toLowerCase()}
          icon={SquareArrowUp}
          iconClassName="bg-sky-100 text-sky-700"
          sparkline={issuedSparkline}
          sparklineColor="#0284c7"
        />
        <KpiCard
          label="Total Consumption"
          value={formatStockQuantity(
            displayUnit,
            activity.salePackets,
            activity.saleQty
          )}
          subtitle={rangeSubtitle.toLowerCase()}
          icon={Droplet}
          iconClassName="bg-orange-100 text-orange-700"
          sparkline={
            consumptionSparkline && consumptionSparkline.length > 1
              ? consumptionSparkline
              : undefined
          }
          sparklineColor="#ea580c"
        />
        <KpiCard
          label={varianceKpi.label}
          value={formatSignedStockQuantity(
            displayUnit,
            varianceKpi.packets,
            varianceKpi.litres
          )}
          subtitle={varianceKpi.packets !== 0 ? "Needs attention" : "Balanced"}
          icon={Scale}
          iconClassName="bg-red-100 text-red-700"
          sparkline={varianceSparkline}
          sparklineColor="#dc2626"
          valueClassName={
            varianceKpi.packets < 0 ? "text-red-600" : undefined
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-0 shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{stockSummaryTitle}</CardTitle>
              <CardDescription>{stockSummaryDescription}</CardDescription>
            </div>
            <Link
              href={stockCountHref}
              className="shrink-0 text-sm text-primary hover:underline"
            >
              View full stock count
            </Link>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <StockSummaryTable
              products={products}
              productActivity={productActivity}
              location={location}
              unit={displayUnit}
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <RecentPanel promise={recentPromise} unit={displayUnit} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Consumption in range
              {displayUnit === "litres" ? " (L)" : ""}
            </CardTitle>
            <Link
              href="/reports?report=consumption"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
              <ChartPanel promise={chartPromise} unit={displayUnit} />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <LowStockPanel
                promise={lowStockPromise}
                location={location}
                unit={displayUnit}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {canWrite && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Quick Actions</h2>
          <QuickActionTiles />
        </div>
      )}
    </>
  );
}
