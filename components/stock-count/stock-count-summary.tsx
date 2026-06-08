import {
  formatInr,
  formatStockQuantity,
  type StockDisplayUnit,
} from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[8rem] flex-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function StockCountSummary({
  depotQty,
  managerQty,
  depotPackets,
  managerPackets,
  totalValue,
  productCount,
  unit = "packets",
}: {
  depotQty: number;
  managerQty: number;
  depotPackets: number;
  managerPackets: number;
  totalValue: number;
  productCount: number;
  unit?: StockDisplayUnit;
}) {
  return (
    <Card className="border bg-muted/20 shadow-sm">
      <CardContent className="flex flex-wrap gap-6 p-4">
        <SummaryTile
          label="Total Depot"
          value={formatStockQuantity(unit, depotPackets, depotQty)}
        />
        <SummaryTile
          label="Total Manager"
          value={formatStockQuantity(unit, managerPackets, managerQty)}
        />
        <SummaryTile label="Total Value" value={formatInr(totalValue)} />
        <SummaryTile label="Oil Types" value={String(productCount)} />
      </CardContent>
    </Card>
  );
}
