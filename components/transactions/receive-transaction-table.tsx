import type { TransactionListRow } from "@/lib/queries/transactions";
import {
  formatDate,
  formatInr,
  formatStockQuantity,
  type StockDisplayUnit,
} from "@/lib/format";
import { transactionRowPackets } from "@/lib/transactions/quantity";
import {
  describeBoxPackaging,
  parsePackageCountFromNote,
  parseUserNoteFromReference,
} from "@/lib/packaging";
import type { OilProduct } from "@/lib/db/schema";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function toProduct(row: TransactionListRow): OilProduct {
  return {
    id: row.productId,
    name: row.productName,
    unit: row.unit as OilProduct["unit"],
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice,
    isActive: true,
    lowStockThreshold: null,
    volumePerBox: row.volumePerBox,
    packetsPerBox: row.packetsPerBox,
    volumePerPacket: row.volumePerPacket,
  };
}

export function ReceiveTransactionTable({
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
        No receipts found for the selected filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Date</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Invoice No.</TableHead>
          <TableHead>Oil Type</TableHead>
          <TableHead>Pack Size</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead className="min-w-[4.5rem]">Total</TableHead>
          <TableHead>Cost / L</TableHead>
          <TableHead>Total Cost</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const litres = Number(row.quantity);
          const costPerL = Number(row.costPrice);
          const totalCost = litres * costPerL;
          const packageCount = parsePackageCountFromNote(row.referenceNote);
          const userNote = parseUserNoteFromReference(row.referenceNote);
          const packSize =
            describeBoxPackaging(toProduct(row)) ?? "—";

          return (
            <TableRow key={row.id}>
              <TableCell>{formatDate(row.transactionDate)}</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell className="max-w-[8rem] truncate">
                {userNote || "—"}
              </TableCell>
              <TableCell className="font-medium">{row.productName}</TableCell>
              <TableCell className="max-w-[10rem] text-xs text-muted-foreground">
                {packSize}
              </TableCell>
              <TableCell>{packageCount ?? "—"}</TableCell>
              <TableCell>
                {formatStockQuantity(
                  unit,
                  transactionRowPackets(row),
                  litres
                )}
              </TableCell>
              <TableCell>{formatInr(costPerL)}</TableCell>
              <TableCell>{formatInr(totalCost)}</TableCell>
              <TableCell>
                <TransactionActions
                  row={row}
                  isAdmin={isAdmin}
                  reversedIds={reversedSet}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
