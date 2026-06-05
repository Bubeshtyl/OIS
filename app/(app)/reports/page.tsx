import { Suspense } from "react";
import { ReportsView } from "@/components/reports/reports-view";
import { getSession } from "@/lib/auth/session";
import {
  getDailySummary,
  getLedger,
  getReversedTransactionIdsFor,
  getStockSummary,
} from "@/lib/queries/inventory";
import { getIstTodayString } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const today = getIstTodayString();
  const start = params.start ?? today.slice(0, 8) + "01";
  const end = params.end ?? today;
  const defaultTab =
    params.tab ?? (session.role === "ACCOUNTS" ? "sales" : "stock");

  const [stock, ledger, summary] = await Promise.all([
    getStockSummary(),
    getLedger({ startDate: start, endDate: end }),
    getDailySummary(start, end),
  ]);
  const reversedIds = await getReversedTransactionIdsFor(
    ledger.map((row) => row.id)
  );

  const sales = ledger.filter((r) => r.type === "SALE");

  return (
    <Suspense fallback={<div className="p-4">Loading reports...</div>}>
      <ReportsView
        stockProducts={stock.products}
        ledger={ledger}
        summary={summary}
        sales={sales}
        reversedIds={Array.from(reversedIds)}
        isAdmin={session.role === "ADMIN"}
        defaultTab={defaultTab}
      />
    </Suspense>
  );
}
