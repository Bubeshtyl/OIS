import { Suspense } from "react";
import { ReportsView } from "@/components/reports/reports-view";
import { canWriteInventory, hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import { parseStockDisplayUnit } from "@/lib/format";
import {
  getLedger,
  getReversedTransactionIdsFor,
} from "@/lib/queries/inventory";
import {
  getStockSummaryReport,
  getVarianceReport,
} from "@/lib/queries/reports";
import {
  defaultReportForRole,
  isReportType,
  type ReportType,
} from "@/lib/reports/config";
import { getIstTodayString } from "@/lib/timezone";

export const dynamic = "force-dynamic";

async function loadReportData(
  tenantId: string,
  report: ReportType,
  start: string,
  end: string
) {
  const needsLedger = [
    "stock-movement",
    "consumption",
    "issued-managers",
  ].includes(report);

  const [stockSummary, variance, ledger] = await Promise.all([
    report === "stock-summary"
      ? getStockSummaryReport(tenantId, start, end)
      : Promise.resolve(null),
    report === "variance"
      ? getVarianceReport(tenantId, start, end)
      : Promise.resolve(null),
    needsLedger
      ? getLedger(tenantId, { startDate: start, endDate: end })
      : Promise.resolve([]),
  ]);

  const reversedIds =
    needsLedger && ledger.length > 0
      ? await getReversedTransactionIdsFor(
          tenantId,
          ledger.map((row) => row.id)
        )
      : [];

  return { stockSummary, variance, ledger, reversedIds };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    report?: string;
    start?: string;
    end?: string;
    unit?: string;
  }>;
}) {
  const params = await searchParams;
  const unit = parseStockDisplayUnit(params.unit);
  const session = await requireTenantSession();
  const canWrite = await canWriteInventory(session);
  const canReverse = await hasPermission(session, "reversal:write");
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(params.start) ? params.start : defaultStart,
    isValidDateString(params.end) ? params.end : defaultEnd
  );
  const report = isReportType(params.report)
    ? params.report
    : defaultReportForRole(canWrite);

  const { stockSummary, variance, ledger, reversedIds } = await loadReportData(
    session.tenantId,
    report,
    start,
    end
  );

  return (
    <Suspense fallback={<div className="p-4">Loading reports...</div>}>
      <ReportsView
        report={report}
        startDate={start}
        endDate={end}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        generatedAt={new Date()}
        stockSummary={stockSummary}
        variance={variance}
        ledger={ledger}
        reversedIds={Array.from(reversedIds)}
        isAdmin={canReverse}
        unit={unit}
      />
    </Suspense>
  );
}
