import { TransactionListShell } from "@/components/transactions/transaction-list-shell";
import { requireTenantSession } from "@/lib/auth/permissions";
import type { Permission } from "@/lib/auth/rbac";
import { requirePermission } from "@/lib/auth/require-permission";
import { loadTransactionPage } from "@/lib/transactions/load-page";

export async function TransactionPageContent({
  pageKind,
  permission,
  searchParams,
}: {
  pageKind: "consumption" | "issued";
  permission: Permission;
  searchParams: Promise<{
    start?: string;
    end?: string;
    recordedBy?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireTenantSession();
  await requirePermission(session, permission);
  const data = await loadTransactionPage(session.tenantId, pageKind, params);

  return <TransactionListShell pageKind={pageKind} {...data} />;
}
