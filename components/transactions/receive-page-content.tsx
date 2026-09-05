import { TransactionListShell } from "@/components/transactions/transaction-list-shell";
import { hasCachedPermission } from "@/lib/auth/session-access";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { getOpenReturnedCases } from "@/lib/queries/returned-cases";
import { loadTransactionPage } from "@/lib/transactions/load-page";

export async function ReceivePageContent({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireTenantSession();
  await requirePermission(session, "receive:write");
  const cachedWrite = hasCachedPermission(session, "receive:write");

  const [canWriteReturns, data, openReturns] = await Promise.all([
    cachedWrite === null
      ? hasPermission(session, "receive:write")
      : Promise.resolve(cachedWrite),
    loadTransactionPage(session.tenantId, "receive", params),
    getOpenReturnedCases(session.tenantId),
  ]);

  return (
    <TransactionListShell
      pageKind="receive"
      {...data}
      openReturns={openReturns}
      canWriteReturns={canWriteReturns}
      showPageChrome={false}
    />
  );
}
