import { TransactionListShell } from "@/components/transactions/transaction-list-shell";
import { requireTenantSession } from "@/lib/auth/permissions";
import { loadTransactionPage } from "@/lib/transactions/load-page";

export const dynamic = "force-dynamic";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    recordedBy?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireTenantSession();
  const data = await loadTransactionPage(
    session.tenantId,
    "consumption",
    params
  );

  return <TransactionListShell pageKind="consumption" {...data} />;
}
