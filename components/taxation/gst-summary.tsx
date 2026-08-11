import { Card, CardContent } from "@/components/ui/card";
import { formatInr } from "@/lib/format";
import type { GstSummary } from "@/lib/taxation/queries";

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[8rem] flex-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function GstSummaryBar({ summary }: { summary: GstSummary }) {
  return (
    <Card className="border bg-muted/20 shadow-sm">
      <CardContent className="flex flex-wrap gap-6 p-4">
        <SummaryTile
          label="Taxable"
          value={formatInr(summary.taxableAmount)}
        />
        <SummaryTile label="CGST" value={formatInr(summary.cgstAmount)} />
        <SummaryTile label="SGST" value={formatInr(summary.sgstAmount)} />
        <SummaryTile
          label="Total GST invoice value"
          value={formatInr(summary.totalAmount)}
        />
      </CardContent>
    </Card>
  );
}
