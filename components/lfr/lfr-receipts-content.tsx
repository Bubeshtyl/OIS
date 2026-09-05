import { LfrInvoiceTable } from "@/components/lfr/lfr-invoice-table";
import { hasCachedPermission } from "@/lib/auth/session-access";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { listLfrInvoices } from "@/lib/queries/lfr-invoice";
import { redirect } from "next/navigation";

export async function LfrReceiptsContent({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const session = await requireTenantSession();
  const cached = hasCachedPermission(session, "taxation:read");
  const allowed =
    cached !== null ? cached : await hasPermission(session, "taxation:read");
  if (!allowed) {
    redirect("/");
  }

  const rows = await listLfrInvoices(session.tenantId, start, end);
  return <LfrInvoiceTable rows={rows} />;
}
