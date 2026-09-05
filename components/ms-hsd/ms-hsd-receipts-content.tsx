import { MsHsdInvoiceTable } from "@/components/ms-hsd/ms-hsd-invoice-table";
import { hasCachedPermission } from "@/lib/auth/session-access";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { listMsHsdInvoices } from "@/lib/queries/ms-hsd-invoice";
import { redirect } from "next/navigation";

export async function MsHsdReceiptsContent({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const session = await requireTenantSession();
  const cached = hasCachedPermission(session, "receive:write");
  const allowed =
    cached !== null ? cached : await hasPermission(session, "receive:write");
  if (!allowed) {
    redirect("/");
  }

  const rows = await listMsHsdInvoices(session.tenantId, start, end);
  return <MsHsdInvoiceTable rows={rows} />;
}
