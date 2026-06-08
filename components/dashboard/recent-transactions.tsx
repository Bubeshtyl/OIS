import {
  ArrowDown,
  ArrowUp,
  SquareArrowDown,
} from "lucide-react";
import {
  formatDate,
  formatStockQuantity,
  type StockDisplayUnit,
} from "@/lib/format";
import {
  parsePackageCountFromNote,
  transactionPacketCount,
} from "@/lib/packaging";
import { cn } from "@/lib/utils";

const typeConfig = {
  SALE: {
    label: "Consumption",
    icon: ArrowDown,
    className: "bg-emerald-100 text-emerald-700",
  },
  TRANSFER: {
    label: "Issued",
    icon: ArrowUp,
    className: "bg-orange-100 text-orange-700",
  },
  RECEIVE: {
    label: "Received",
    icon: SquareArrowDown,
    className: "bg-sky-100 text-sky-700",
  },
  REVERSAL: {
    label: "Reversal",
    icon: ArrowDown,
    className: "bg-slate-100 text-slate-700",
  },
} as const;

export function RecentTransactions({
  rows,
  unit = "packets",
}: {
  unit?: StockDisplayUnit;
  rows: Array<{
    id: string;
    type: keyof typeof typeConfig;
    productName: string;
    quantity: string;
    unit: string;
    transactionDate: string;
    createdAt: Date;
    referenceNote?: string | null;
    packetsPerBox?: string | null;
    volumePerPacket?: string | null;
  }>;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No recent transactions.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const config = typeConfig[row.type];
        const Icon = config.icon;
        const time = new Date(row.createdAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        });
        const packageCount = parsePackageCountFromNote(row.referenceNote);
        const packetTotal = transactionPacketCount(
          row.type,
          Number(row.quantity),
          packageCount,
          row
        );
        const userNote = row.referenceNote
          ?.split("\n")
          .slice(1)
          .join(" · ")
          .trim();
        const subtitleParts = [
          config.label,
          userNote || null,
        ].filter(Boolean);

        return (
          <div
            key={row.id}
            className="flex items-center gap-3"
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                config.className
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.productName}</p>
              <p className="text-xs text-muted-foreground">
                {subtitleParts.join(" · ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                {formatStockQuantity(
                  unit,
                  packetTotal,
                  Number(row.quantity)
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(row.transactionDate)} {time}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
