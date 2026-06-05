import Link from "next/link";
import {
  formatDate,
  formatInr,
  formatTransactionQuantity,
} from "@/lib/format";
import { parsePackageCountFromNote } from "@/lib/packaging";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TransactionHistory({
  rows,
  emptyMessage = "No transactions yet.",
  packageColumnLabel = "Boxes",
}: {
  rows: Array<{
    productName: string;
    quantity: string;
    unit: string;
    transactionDate: string;
    type?: "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL";
    referenceNote?: string | null;
    packetsPerBox?: string | null;
    volumePerPacket?: string | null;
  }>;
  emptyMessage?: string;
  packageColumnLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>{packageColumnLabel}</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => {
          const packageCount = parsePackageCountFromNote(row.referenceNote);

          return (
            <TableRow key={`${row.productName}-${row.transactionDate}-${i}`}>
              <TableCell>{row.productName}</TableCell>
              <TableCell>
                {packageCount != null ? packageCount : "—"}
              </TableCell>
              <TableCell>
                {row.type
                  ? formatTransactionQuantity(
                      row.type,
                      row.quantity,
                      row.referenceNote,
                      row,
                      row.unit
                    )
                  : formatTransactionQuantity(
                      "TRANSFER",
                      row.quantity,
                      row.referenceNote,
                      row,
                      row.unit
                    )}
              </TableCell>
              <TableCell>{formatDate(row.transactionDate)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SegmentBadge({
  type,
}: {
  type: "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL";
}) {
  const labels = {
    RECEIVE: "Receive",
    TRANSFER: "Transfer",
    SALE: "Sale",
    REVERSAL: "Reversal",
  };

  return <Badge variant="secondary">{labels[type]}</Badge>;
}

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/receive" className={cn(buttonVariants())}>
        Receive
      </Link>
      <Link
        href="/transfer"
        className={cn(buttonVariants({ variant: "secondary" }))}
      >
        Transfer
      </Link>
      <Link
        href="/sales"
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Sale
      </Link>
    </div>
  );
}

export function StockValueRow({
  label,
  quantity,
  value,
}: {
  label: string;
  quantity: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{quantity}</p>
      <p className="text-sm text-muted-foreground">{formatInr(value)}</p>
    </div>
  );
}
