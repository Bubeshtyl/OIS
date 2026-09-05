import { Suspense } from "react";
import { DailySalesReportView } from "@/components/daily-sales/daily-sales-report-view";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { parseDailySalesFilters } from "@/lib/daily-sales/filters";
import {
  getDailySalesFilterOptions,
  getDailySalesReportPage,
} from "@/lib/queries/daily-sales";


export default async function DailySalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireTenantSession();
  await requirePermission(session, "daily-sales:read");
  const params = await searchParams;
  const filters = parseDailySalesFilters(params);
  const page = Number.parseInt(params.page ?? "1", 10);

  const [report, options] = await Promise.all([
    getDailySalesReportPage({ tenantId: session.tenantId, filters, page }),
    getDailySalesFilterOptions(session.tenantId),
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
