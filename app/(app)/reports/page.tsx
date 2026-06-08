import { Suspense } from "react";
import { ReportsView } from "@/components/reports/reports-view";
import { getSession } from "@/lib/auth/session";
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
      ? getStockSummaryReport(start, end)
      : Promise.resolve(null),
    report === "variance" ? getVarianceReport(start, end) : Promise.resolve(null),
    needsLedger ? getLedger({ startDate: start, endDate: end }) : Promise.resolve([]),
  ]);

  const reversedIds =
    needsLedger && ledger.length > 0
      ? await getReversedTransactionIdsFor(ledger.map((row) => row.id))
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
  const session = await getSession();
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(params.start) ? params.start : defaultStart,
    isValidDateString(params.end) ? params.end : defaultEnd
  );
  const report = isReportType(params.report)
    ? params.report
    : defaultReportForRole(session.role);

  const { stockSummary, variance, ledger, reversedIds } = await loadReportData(
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
        isAdmin={session.role === "ADMIN"}
        unit={unit}
      />
    </Suspense>
  );
}
