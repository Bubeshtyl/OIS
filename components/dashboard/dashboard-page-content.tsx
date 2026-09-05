import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { DashboardLocation } from "@/components/dashboard/dashboard-location-tabs";
import { canWriteInventory } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import type { StockDisplayUnit } from "@/lib/format";
import {
  getActivityForRange,
  getDailySummary,
  getLowStockAlerts,
  getProductActivityForRange,
  getRecentTransactions,
  getSalesForDateRange,
  getStockSummary,
} from "@/lib/queries/inventory";

function buildSparkline(
  daily: Array<{ received: number; transferred: number; sold: number }>,
  pick: (row: { received: number; transferred: number; sold: number }) => number
) {
  const points = daily.map(pick);
  return points.length > 1 ? points : undefined;
}

export async function DashboardPageContent({
  start,
  end,
  location,
  unit,
}: {
  start: string;
  end: string;
  location: DashboardLocation;
  unit: StockDisplayUnit;
}) {
  const session = await requireTenantSession();
  await requirePermission(session, "dashboard:read");

  const stockPromise = getStockSummary(session.tenantId);
  const activityPromise = getActivityForRange(session.tenantId, start, end);
  const productActivityPromise = getProductActivityForRange(
    session.tenantId,
    start,
    end
  );
  const dailyPromise = getDailySummary(session.tenantId, start, end);
  const recentPromise = getRecentTransactions(session.tenantId, undefined, 6, {
    startDate: start,
    endDate: end,
  });
  const chartPromise = getSalesForDateRange(session.tenantId, start, end);

  const [stock, activity, productActivity, daily] = await Promise.all([
    stockPromise,
    activityPromise,
    productActivityPromise,
    dailyPromise,
  ]);

  const lowStockPromise = getLowStockAlerts(session.tenantId, stock.products);

  const dailyAsc = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const issuedSparkline = buildSparkline(dailyAsc, (d) => d.transferred);
  const receivedSparkline = buildSparkline(dailyAsc, (d) => d.received);
  const varianceSparkline = buildSparkline(
    dailyAsc,
    (d) => d.received - d.transferred
  );
  const consumptionSparkline = buildSparkline(dailyAsc, (d) => d.sold);

  const depotOpeningPackets =
    stock.depotPackets -
    activity.receivePackets +
    activity.transferPackets -
    activity.returnedPackets;
  const depotOpeningLitres =
    stock.depotQty -
    activity.receiveQty +
    activity.transferQty -
    activity.returnedQty;
  const managerOpeningPackets =
    stock.managerPackets -
    activity.transferPackets +
    activity.salePackets +
    activity.damagedPackets +
    activity.returnedPackets;
  const managerOpeningLitres =
    stock.managerQty -
    activity.transferQty +
    activity.saleQty +
    activity.damagedQty +
    activity.returnedQty;

  const depotVariancePackets =
    depotOpeningPackets +
    activity.receivePackets -
    activity.transferPackets +
    activity.returnedPackets -
    stock.depotPackets;
  const managerVariancePackets =
    managerOpeningPackets +
    activity.transferPackets -
    activity.salePackets -
    activity.damagedPackets -
    activity.returnedPackets -
    stock.managerPackets;
  const systemVariancePackets = depotVariancePackets + managerVariancePackets;

  const depotVarianceLitres =
    depotOpeningLitres +
    activity.receiveQty -
    activity.transferQty +
    activity.returnedQty -
    stock.depotQty;
  const managerVarianceLitres =
    managerOpeningLitres +
    activity.transferQty -
    activity.saleQty -
    activity.damagedQty -
    activity.returnedQty -
    stock.managerQty;
  const systemVarianceLitres = depotVarianceLitres + managerVarianceLitres;

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
    location === "all" ? "/stock-count" : `/stock-count?location=${location}`;

  const stockSummaryTitle =
    location === "manager"
      ? "Manager Stock Summary"
      : location === "depot"
        ? "Depot Stock Summary"
        : "Stock Summary";

  const stockSummaryDescription =
    location === "manager"
      ? "Opening + issued − sold − damaged − returned = balance (selected range)."
      : location === "depot"
        ? "Opening + received − issued + returned = balance (selected range). Damaged is shown for manager activity."
        : "Current balances across depot and manager locations.";

  const productActivityRecord = Object.fromEntries(productActivity);

  return (
    <DashboardView
      location={location}
      unit={unit}
      canWrite={await canWriteInventory(session)}
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
      recentPromise={recentPromise}
      chartPromise={chartPromise}
      lowStockPromise={lowStockPromise}
      receivedSparkline={receivedSparkline}
      issuedSparkline={issuedSparkline}
      consumptionSparkline={consumptionSparkline}
      varianceSparkline={varianceSparkline}
    />
  );
}
