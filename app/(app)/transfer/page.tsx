import { TransactionListShell } from "@/components/transactions/transaction-list-shell";
import { getSession } from "@/lib/auth/session";
import { loadTransactionPage } from "@/lib/transactions/load-page";

export const dynamic = "force-dynamic";

export default async function TransferPage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    search?: string;
    product?: string;
    recordedBy?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const data = await loadTransactionPage("issued", params);

  return (
    <TransactionListShell
      pageKind="issued"
      isAdmin={session.role === "ADMIN"}
      {...data}
    />
  );
}
