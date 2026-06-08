import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { DashboardLocation } from "@/components/dashboard/dashboard-location-tabs";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { PageHeader } from "@/components/shared/page-blocks";
import { canWriteInventory } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import { parseStockDisplayUnit } from "@/lib/format";
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

function parseDashboardLocation(value?: string): DashboardLocation {
  if (value === "depot" || value === "manager") return value;
  return "all";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    location?: string;
    unit?: string;
  }>;
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
  const location = parseDashboardLocation(params.location);
  const unit = parseStockDisplayUnit(params.unit);
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

  const depotVariancePackets =
    activity.receivePackets -
    activity.transferPackets -
    stock.depotPackets;
  const managerVariancePackets =
    activity.transferPackets -
    activity.salePackets -
    stock.managerPackets;
  const systemVariancePackets =
    activity.receivePackets -
    activity.salePackets -
    (stock.depotPackets + stock.managerPackets);

  const depotVarianceLitres =
    activity.receiveQty - activity.transferQty - stock.depotQty;
  const managerVarianceLitres =
    activity.transferQty - activity.saleQty - stock.managerQty;
  const systemVarianceLitres =
    activity.receiveQty -
    activity.saleQty -
    (stock.depotQty + stock.managerQty);

  const stockKpi =
    location === "manager"
      ? {
          label: "Total Manager Stock",
          packets: stock.managerPackets,
          litres: stock.managerQty,
        }
      : location === "depot"
        ? {
            label: "Total Depot Stock",
            packets: stock.depotPackets,
            litres: stock.depotQty,
          }
        : {
            label: "Total Stock",
            packets: stock.depotPackets + stock.managerPackets,
            litres: stock.depotQty + stock.managerQty,
          };

  const varianceKpi =
    location === "manager"
      ? {
          label: "Variance (Manager)",
          packets: managerVariancePackets,
          litres: managerVarianceLitres,
        }
      : location === "depot"
        ? {
            label: "Variance (Depot)",
            packets: depotVariancePackets,
            litres: depotVarianceLitres,
          }
        : {
            label: "Variance (System)",
            packets: systemVariancePackets,
            litres: systemVarianceLitres,
          };

  const stockCountHref =
    location === "all"
      ? "/stock-count"
      : `/stock-count?location=${location}`;

  const stockSummaryTitle =
    location === "manager"
      ? "Manager Stock Summary"
      : location === "depot"
        ? "Depot Stock Summary"
        : "Stock Summary";

  const stockSummaryDescription =
    location === "manager"
      ? "Issued and consumption are for the selected date range. Balance is current stock at manager."
      : location === "depot"
        ? "Received and issued are for the selected date range. Balance is current stock at depot."
        : "Current balances across depot and manager locations.";

  const productActivityRecord = Object.fromEntries(productActivity);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <PageHeader
            title="Dashboard"
            subtitle="Overview of oil inventory and movement"
          />
        </div>
        <PageToolbar
          startDate={start}
          endDate={end}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
          extraParams={
            location !== "all" ? { location } : undefined
          }
        />
      </div>

      <DashboardView
        location={location}
        unit={unit}
        canWrite={canWriteInventory(session.role)}
        stockKpi={stockKpi}
        varianceKpi={varianceKpi}
        activity={{
          transferPackets: activity.transferPackets,
          transferQty: activity.transferQty,
          salePackets: activity.salePackets,
          saleQty: activity.saleQty,
        }}
        oilTypeCount={stock.products.length}
        rangeSubtitle="In selected range"
        stockCountHref={stockCountHref}
        stockSummaryTitle={stockSummaryTitle}
        stockSummaryDescription={stockSummaryDescription}
        products={stock.products}
        productActivity={productActivityRecord}
        recent={recent}
        chartData={chartData}
        lowStock={lowStock}
        receivedSparkline={receivedSparkline}
        issuedSparkline={issuedSparkline}
        consumptionSparkline={consumptionSparkline}
        varianceSparkline={varianceSparkline}
      />
    </div>
  );
}
