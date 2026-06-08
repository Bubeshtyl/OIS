import { formatInr, formatStockQuantity, type StockDisplayUnit } from "@/lib/format";
import type {
  ConsumptionSummary,
  IssuedSummary,
  ReceiveSummary,
  TransactionListSummary,
} from "@/lib/transactions/types";
import type { TransactionPageKind } from "@/lib/transactions/page-config";
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

export function TransactionSummaryBar({
  pageKind,
  summary,
  unit = "packets",
}: {
  pageKind: TransactionPageKind;
  summary: TransactionListSummary;
  unit?: StockDisplayUnit;
}) {
  let tiles: Array<{ label: string; value: string }> = [];

  if (pageKind === "receive") {
    const s = summary as ReceiveSummary;
    tiles = [
      {
        label: "Total Receipts",
        value: formatStockQuantity(unit, s.totalPackets, s.totalLitres),
      },
      { label: "Total Cost", value: formatInr(s.totalCost) },
      {
        label: "Avg. Cost / L",
        value: s.avgCostPerLitre > 0 ? formatInr(s.avgCostPerLitre) : "—",
      },
      { label: "Receipts Count", value: String(s.count) },
    ];
  } else if (pageKind === "issued") {
    const s = summary as IssuedSummary;
    tiles = [
      {
        label: "Total Issued",
        value: formatStockQuantity(unit, s.totalPackets, s.totalLitres),
      },
      { label: "Issues Count", value: String(s.count) },
      { label: "Active Managers", value: String(s.activeCreators) },
    ];
  } else {
    const s = summary as ConsumptionSummary;
    tiles = [
      {
        label: "Total Consumption",
        value: formatStockQuantity(unit, s.totalPackets, s.totalLitres),
      },
      { label: "Consumption Count", value: String(s.count) },
      {
        label: "Daily Average",
        value: formatStockQuantity(
          unit,
          s.dailyAveragePackets,
          s.dailyAverage
        ),
      },
    ];
  }

  return (
    <Card className="border bg-muted/20 shadow-sm">
      <CardContent className="flex flex-wrap gap-6 p-4">
        {tiles.map((tile) => (
          <SummaryTile key={tile.label} label={tile.label} value={tile.value} />
        ))}
      </CardContent>
    </Card>
  );
}
