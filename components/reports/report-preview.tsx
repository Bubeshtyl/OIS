import {
  formatSignedStockQuantity,
  formatStockQuantity,
  type StockDisplayUnit,
} from "@/lib/format";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ReportPreview({
  title,
  generatedAt,
  children,
  className,
  unitToggle,
}: {
  title: string;
  generatedAt: Date;
  children: React.ReactNode;
  className?: string;
  unitToggle?: React.ReactNode;
}) {
  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b bg-muted/30 pb-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Generated: {formatDateTime(generatedAt)} IST
          </p>
        </div>
        {unitToggle}
      </CardHeader>
      <CardContent className="overflow-x-auto p-4 [scrollbar-gutter:stable]">
        {children}
      </CardContent>
    </Card>
  );
}

export function ReportQuantityCell({
  value,
  packets,
  litres,
  unit = "packets",
  emphasize = false,
}: {
  value?: number;
  packets?: number;
  litres?: number;
  unit?: StockDisplayUnit;
  emphasize?: boolean;
}) {
  const packetValue = packets ?? 0;
  const litreValue = litres ?? value ?? 0;
  const negative = litreValue < 0 || packetValue < 0;

  return (
    <span
      className={cn(
        emphasize && "font-semibold",
        negative && "text-destructive"
      )}
    >
      {formatStockQuantity(unit, packetValue, litreValue)}
    </span>
  );
}

export function ReportVarianceCell({
  packets,
  litres,
  unit = "packets",
}: {
  packets: number;
  litres: number;
  unit?: StockDisplayUnit;
}) {
  const negative =
    (unit === "litres" || packets <= 0 ? litres : packets) < 0;
  const positive =
    (unit === "litres" || packets <= 0 ? litres : packets) > 0;

  return (
    <span
      className={cn(
        "font-medium",
        negative && "text-destructive",
        positive && "text-emerald-700"
      )}
    >
      {formatSignedStockQuantity(unit, packets, litres)}
    </span>
  );
}

/** @deprecated Use ReportQuantityCell with unit prop */
export function ReportLitresCell({
  value,
  emphasize = false,
}: {
  value: number;
  emphasize?: boolean;
}) {
  return (
    <ReportQuantityCell
      litres={value}
      unit="litres"
      emphasize={emphasize}
    />
  );
}
