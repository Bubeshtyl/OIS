import { TransactionListShell } from "@/components/transactions/transaction-list-shell";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { getOpenReturnedCases } from "@/lib/queries/returned-cases";
import { loadTransactionPage } from "@/lib/transactions/load-page";

export const dynamic = "force-dynamic";

export default async function ReceivePage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireTenantSession();
  const [canWriteReturns, data, openReturns] = await Promise.all([
    hasPermission(session, "receive:write"),
    loadTransactionPage(session.tenantId, "receive", params),
    getOpenReturnedCases(session.tenantId),
  ]);

  return (
    <TransactionListShell
      pageKind="receive"
      {...data}
      openReturns={openReturns}
      canWriteReturns={canWriteReturns}
    />
  );
}
