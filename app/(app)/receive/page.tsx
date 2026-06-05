import { ReceiveForm } from "@/components/forms/receive-form";
import {
  PageHeader,
  TransactionHistory,
} from "@/components/shared/page-blocks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveProducts, getRecentTransactions } from "@/lib/queries/inventory";

export const dynamic = "force-dynamic";

export default async function ReceivePage() {
  const [products, recent] = await Promise.all([
    getActiveProducts(),
    getRecentTransactions("RECEIVE"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Receive Stock" subtitle="Supplier → Depot" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiveForm products={products} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionHistory rows={recent} />
        </CardContent>
      </Card>
    </div>
  );
}
