"use client";

import Link from "next/link";
import { Container, Droplet, Scale, SquareArrowUp } from "lucide-react";
import {
  DashboardLocationTabs,
  type DashboardLocation,
} from "@/components/dashboard/dashboard-location-tabs";
import { StockSummaryTable } from "@/components/dashboard/stock-summary-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickActionTiles } from "@/components/dashboard/quick-action-tiles";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { SalesChart } from "@/components/dashboard/sales-chart";
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
  consumed: number;
  receivedPackets: number;
  issuedPackets: number;
  consumedPackets: number;
};

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
  recent,
  chartData,
  lowStock,
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
  recent: Array<{
    id: string;
    type: "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL";
    productName: string;
    quantity: string;
    unit: string;
    transactionDate: string;
    createdAt: Date;
    referenceNote?: string | null;
    packetsPerBox?: string | null;
    volumePerPacket?: string | null;
  }>;
  chartData: Array<{ label: string; quantity: number; litres?: number }>;
  lowStock: ProductRow[];
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DashboardLocationTabs location={location} />
        <StockUnitToggle unit={displayUnit} onChange={setDisplayUnit} />
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
          sparklineColor="#16a34a"
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
          <CardContent>
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
            <RecentTransactions rows={recent} unit={displayUnit} />
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
            <SalesChart data={chartData} unit={displayUnit} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {location === "depot" ? (
              <p className="text-sm text-muted-foreground">
                Low stock alerts apply to manager balances. Switch to Manager or
                All to view.
              </p>
            ) : lowStock.length === 0 ? (
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
                        {formatStockQuantity(
                          displayUnit,
                          item.managerPackets,
                          item.manager
                        )}{" "}
                        at Manager
                        {item.lowStockThreshold != null
                          ? ` · alert at ${formatStockQuantity(
                              displayUnit,
                              item.lowStockThreshold,
                              item.lowStockThreshold *
                                Number(item.volumePerPacket ?? 0)
                            )}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.depot > 0
                          ? `${formatStockQuantity(
                              displayUnit,
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
              ))
            )}
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
