import Link from "next/link";
import { MsHsdInvoiceTable } from "@/components/ms-hsd/ms-hsd-invoice-table";
import { PageToolbar } from "@/components/layout/page-toolbar";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import { listMsHsdInvoices } from "@/lib/queries/ms-hsd-invoice";
import { getIstTodayString } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MsHsdReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
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

  const rows = await listMsHsdInvoices(session.tenantId, start, end);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="MS / HSD Receipts" />
        <div className="flex flex-wrap items-center gap-2">
          <PageToolbar
            startDate={start}
            endDate={end}
            defaultStart={defaultStart}
            defaultEnd={defaultEnd}
          />
          <Link
            href="/invoice-purchase/ms-hsd-receipts/new"
            className={cn(buttonVariants({ variant: "default" }), "shrink-0")}
          >
            + Add invoice
          </Link>
        </div>
      </div>

      <MsHsdInvoiceTable rows={rows} />
    </div>
  );
}
