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
import type { TdsRow, TdsSummary } from "@/lib/taxation/queries";
import { formatTdsRatePercent } from "@/lib/taxation/tds";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<TdsRow["source"], string> = {
  MS_HSD: "MS/HSD",
  LFR: "LFR",
  OIL: "Oil",
};

export function TdsRowsTable({
  rows,
  summary,
}: {
  rows: TdsRow[];
  summary: TdsSummary;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No receipts in this date range.
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
            <TableHead className="text-right">Base amount</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">TDS</TableHead>
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
                {formatInr(row.baseAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatTdsRatePercent(row.rate)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(row.tdsAmount)}
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
              {formatInr(summary.baseTotal)}
            </TableCell>
            <TableCell />
            <TableCell className="text-right font-medium tabular-nums">
              {formatInr(summary.grandTotal)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
