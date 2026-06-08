import type { TransactionListRow } from "@/lib/queries/transactions";
import { formatDate, formatStockQuantity, type StockDisplayUnit } from "@/lib/format";
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
  rows: TransactionListRow[];
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
          <TableHead>Date</TableHead>
          <TableHead>Manager</TableHead>
          <TableHead>Oil Type</TableHead>
          <TableHead className="min-w-[4.5rem]">Quantity Used</TableHead>
          <TableHead>Recorded By</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDate(row.transactionDate)}</TableCell>
            <TableCell>Oil Manager</TableCell>
            <TableCell className="font-medium">{row.productName}</TableCell>
            <TableCell>
              {formatStockQuantity(
                unit,
                transactionRowPackets(row),
                Number(row.quantity)
              )}
            </TableCell>
            <TableCell>{row.createdByName}</TableCell>
            <TableCell className="max-w-[12rem] truncate text-muted-foreground">
              {parseUserNoteFromReference(row.referenceNote) || "—"}
            </TableCell>
            <TableCell>
              <TransactionActions
                row={row}
                isAdmin={isAdmin}
                reversedIds={reversedSet}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
