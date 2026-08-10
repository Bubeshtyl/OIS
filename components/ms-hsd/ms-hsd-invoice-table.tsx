import Link from "next/link";
import { formatDate, formatInr } from "@/lib/format";
import type { MsHsdInvoiceListItem } from "@/lib/queries/ms-hsd-invoice";
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

export function MsHsdInvoiceTable({
  rows,
}: {
  rows: MsHsdInvoiceListItem[];
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No MS/HSD invoices in this date range.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Invoice No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Products</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.invoiceNo}</TableCell>
              <TableCell>{formatDate(row.invoiceDate)}</TableCell>
              <TableCell className="max-w-[16rem] truncate text-sm text-muted-foreground">
                {row.productSummary}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(row.totalAmount)}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/invoice-purchase/ms-hsd-receipts/${row.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  Edit
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
