import { MonthToolbar } from "@/components/layout/month-toolbar";
import { PageHeader } from "@/components/shared/page-blocks";
import { TdsRowsTable } from "@/components/taxation/tds-rows-table";
import { TdsSummaryBar } from "@/components/taxation/tds-summary";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import {
  defaultMonth,
  isValidMonthString,
  monthBounds,
} from "@/lib/date-range";
import { getTdsReport } from "@/lib/taxation/queries";
import { getIstTodayString } from "@/lib/timezone";
import { redirect } from "next/navigation";

export default async function TdsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "taxation:read"))) {
    redirect("/");
  }

  const params = await searchParams;
  const today = getIstTodayString();
  const currentMonth = defaultMonth(today);
  const month = isValidMonthString(params.month) ? params.month : currentMonth;
  const { start, end } = monthBounds(month);

  const { rows, summary } = await getTdsReport(session.tenantId, start, end);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="TDS" />
        <MonthToolbar month={month} defaultMonth={currentMonth} />
      </div>

      <TdsSummaryBar summary={summary} />
      <TdsRowsTable rows={rows} summary={summary} />
    </div>
  );
}
