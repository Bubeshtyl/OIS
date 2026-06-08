import type { DisplayTransactionRow } from "@/lib/transactions/types";
import { formatDateTime, formatStockQuantity, type StockDisplayUnit } from "@/lib/format";
import { transactionRowPackets } from "@/lib/transactions/quantity";
import { parseUserNoteFromReference } from "@/lib/packaging";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ConsumptionTransactionTable({
  rows,
  isAdmin,
  reversedIds,
  unit = "packets",
}: {
  rows: DisplayTransactionRow[];
  isAdmin: boolean;
  reversedIds: string[];
  unit?: StockDisplayUnit;
}) {
  const reversedSet = new Set(reversedIds);

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No consumption records found for the selected filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Recorded</TableHead>
          <TableHead>Oil Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="min-w-[4.5rem]">Qty</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDateTime(row.createdAt)}
            </TableCell>
            <TableCell className="font-medium">
              {row.productName}
              {row.isAggregated ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({row.entryCount} entries)
                </span>
              ) : null}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.type === "SALE"
                ? "Sale"
                : row.type === "RETURNED"
                  ? "Returned"
                  : "Damaged"}
            </TableCell>
            <TableCell>
              {formatStockQuantity(
                unit,
                transactionRowPackets(row),
                Number(row.quantity)
              )}
            </TableCell>
            <TableCell className="max-w-[12rem] truncate text-muted-foreground">
              {row.isAggregated
                ? "—"
                : parseUserNoteFromReference(row.referenceNote) || "—"}
            </TableCell>
            <TableCell>
              {row.isAggregated ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <TransactionActions
                  row={row}
                  isAdmin={isAdmin}
                  reversedIds={reversedSet}
                />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
