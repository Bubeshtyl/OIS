import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatInr } from "@/lib/format";
import type { GstRow, GstSummary } from "@/lib/taxation/queries";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<GstRow["source"], string> = {
  LFR: "LFR",
  OIL: "Oil",
};

export function GstRowsTable({
  rows,
  summary,
}: {
  rows: GstRow[];
  summary: GstSummary;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No LFR or Oil receipts in this date range.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Invoice No.</TableHead>
            <TableHead className="text-right">Taxable</TableHead>
            <TableHead className="text-right">CGST</TableHead>
            <TableHead className="text-right">SGST</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.source}-${row.invoiceNo}-${row.invoiceDate}`}>
              <TableCell>{formatDate(row.invoiceDate)}</TableCell>
              <TableCell>{SOURCE_LABEL[row.source]}</TableCell>
              <TableCell className="font-medium">{row.invoiceNo}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(row.taxableAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(row.cgstAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(row.sgstAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(row.totalAmount)}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={row.href}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="font-medium">
              Total
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatInr(summary.taxableAmount)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatInr(summary.cgstAmount)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatInr(summary.sgstAmount)}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatInr(summary.totalAmount)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
