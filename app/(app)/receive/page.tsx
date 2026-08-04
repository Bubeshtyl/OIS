import { TransactionListShell } from "@/components/transactions/transaction-list-shell";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
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
  const [canReverse, data] = await Promise.all([
    hasPermission(session, "reversal:write"),
    loadTransactionPage(session.tenantId, "receive", params),
  ]);

  return (
    <TransactionListShell pageKind="receive" isAdmin={canReverse} {...data} />
  );
}
