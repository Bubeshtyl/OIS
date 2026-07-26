import { Suspense } from "react";
import { DailySalesReportView } from "@/components/daily-sales/daily-sales-report-view";
import { parseDailySalesFilters } from "@/lib/daily-sales/filters";
import {
  getDailySalesFilterOptions,
  getDailySalesReportPage,
} from "@/lib/queries/daily-sales";

export const dynamic = "force-dynamic";

export default async function DailySalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseDailySalesFilters(params);
  const page = Number.parseInt(params.page ?? "1", 10);

  const [report, options] = await Promise.all([
    getDailySalesReportPage({ filters, page }),
    getDailySalesFilterOptions(),
  ]);

  return (
    <Suspense fallback={<div className="p-4">Loading daily sales…</div>}>
      <DailySalesReportView
        filters={filters}
        products={options.products}
        mopTypes={options.mopTypes}
        rows={report.rows}
        page={report.page}
        pageSize={report.pageSize}
        total={report.total}
        totalPages={report.totalPages}
      />
    </Suspense>
  );
}
