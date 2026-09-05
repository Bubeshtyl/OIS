import { Suspense } from "react";
import { StockCountView } from "@/components/stock-count/stock-count-view";
import { requireTenantSession } from "@/lib/auth/permissions";
import { parseStockDisplayUnit } from "@/lib/format";
import {
  getLowStockAlerts,
  getStockSummary,
} from "@/lib/queries/inventory";


export default async function StockCountPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string;
    location?: string;
    unit?: string;
  }>;
}) {
  const session = await requireTenantSession();
  const params = await searchParams;
  const unit = parseStockDisplayUnit(params.unit);
  const [stock, lowStock] = await Promise.all([
    getStockSummary(session.tenantId),
    getLowStockAlerts(session.tenantId),
  ]);

  return (
    <Suspense fallback={<div className="p-4">Loading stock count...</div>}>
      <StockCountView
        products={stock.products.map((product) => ({
          id: product.id,
          name: product.name,
          depot: product.depot,
          manager: product.manager,
          depotPackets: product.depotPackets,
          managerPackets: product.managerPackets,
          costPrice: product.costPrice,
        }))}
        totals={{
          depotQty: stock.depotQty,
          managerQty: stock.managerQty,
          depotPackets: stock.depotPackets,
          managerPackets: stock.managerPackets,
          depotValue: stock.depotValue,
          managerValue: stock.managerValue,
        }}
        lowStockIds={lowStock.map((item) => item.id)}
        productId={params.product}
        location={params.location}
        unit={unit}
      />
    </Suspense>
  );
}
