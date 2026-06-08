import { TransactionListShell } from "@/components/transactions/transaction-list-shell";
import { getSession } from "@/lib/auth/session";
import { loadTransactionPage } from "@/lib/transactions/load-page";

export const dynamic = "force-dynamic";

export default async function ReceivePage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    search?: string;
    product?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const data = await loadTransactionPage("receive", params);

  return (
    <TransactionListShell
      pageKind="receive"
      isAdmin={session.role === "ADMIN"}
      {...data}
    />
  );
}
