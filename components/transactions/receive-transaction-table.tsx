import type { DisplayTransactionRow } from "@/lib/transactions/types";
import {
  formatDateTime,
  formatInr,
  formatStockQuantity,
  type StockDisplayUnit,
} from "@/lib/format";
import { transactionRowPackets } from "@/lib/transactions/quantity";
import {
  describeBoxPackaging,
  parsePackageCountFromNote,
  parseInvoiceFromReference,
  parseSupplierFromReference,
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

function toProduct(row: DisplayTransactionRow): OilProduct {
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
  rows: DisplayTransactionRow[];
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
          <TableHead>Recorded</TableHead>
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
          const supplier = row.isAggregated
            ? row.aggregatedSupplier ?? "—"
            : parseSupplierFromReference(row.referenceNote);
          const invoice = row.isAggregated
            ? row.aggregatedInvoice ?? "—"
            : parseInvoiceFromReference(row.referenceNote);
          const packSize = describeBoxPackaging(toProduct(row)) ?? "—";

          return (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </TableCell>
              <TableCell>{supplier || "—"}</TableCell>
              <TableCell className="max-w-[8rem] truncate">
                {invoice || "—"}
              </TableCell>
              <TableCell className="font-medium">
                {row.productName}
                {row.isAggregated ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({row.entryCount} entries)
                  </span>
                ) : null}
              </TableCell>
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
          );
        })}
      </TableBody>
    </Table>
  );
}
