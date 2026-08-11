import { PageToolbar } from "@/components/layout/page-toolbar";
import { PageHeader } from "@/components/shared/page-blocks";
import { TdsRowsTable } from "@/components/taxation/tds-rows-table";
import { TdsSummaryBar } from "@/components/taxation/tds-summary";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import { getTdsReport } from "@/lib/taxation/queries";
import { getIstTodayString } from "@/lib/timezone";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TdsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "taxation:read"))) {
    redirect("/");
  }

  const params = await searchParams;
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(params.start) ? params.start : defaultStart,
    isValidDateString(params.end) ? params.end : defaultEnd
  );

  const { rows, summary } = await getTdsReport(session.tenantId, start, end);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="TDS" />
        <PageToolbar
          startDate={start}
          endDate={end}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
        />
      </div>

      <TdsSummaryBar summary={summary} />
      <TdsRowsTable rows={rows} summary={summary} />
    </div>
  );
}
