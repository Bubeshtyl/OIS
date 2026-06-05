import { TransferForm } from "@/components/forms/transfer-form";
import {
  PageHeader,
  TransactionHistory,
} from "@/components/shared/page-blocks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveProducts, getRecentTransactions } from "@/lib/queries/inventory";

export const dynamic = "force-dynamic";

export default async function TransferPage() {
  const [products, recent] = await Promise.all([
    getActiveProducts(),
    getRecentTransactions("TRANSFER"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Transfer Stock" subtitle="Depot → Oil Manager" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <TransferForm products={products} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionHistory rows={recent} />
        </CardContent>
      </Card>
    </div>
  );
}
