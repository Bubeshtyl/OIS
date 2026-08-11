import { Card, CardContent } from "@/components/ui/card";
import { formatInr } from "@/lib/format";
import type { TdsSummary } from "@/lib/taxation/queries";

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[8rem] flex-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function TdsSummaryBar({ summary }: { summary: TdsSummary }) {
  return (
    <Card className="border bg-muted/20 shadow-sm">
      <CardContent className="flex flex-wrap gap-6 p-4">
        <SummaryTile label="MS/HSD TDS" value={formatInr(summary.msHsdTds)} />
        <SummaryTile label="LFR TDS" value={formatInr(summary.lfrTds)} />
        <SummaryTile label="Oil TDS" value={formatInr(summary.oilTds)} />
        <SummaryTile
          label="Grand total"
          value={formatInr(summary.grandTotal)}
        />
      </CardContent>
    </Card>
  );
}
