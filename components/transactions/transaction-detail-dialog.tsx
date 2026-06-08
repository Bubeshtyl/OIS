"use client";

import type { TransactionListRow } from "@/lib/transactions/types";
import { formatDate, formatInr, formatLitres, formatTransactionQuantity } from "@/lib/format";
import {
  describeBoxPackaging,
  parsePackageCountFromNote,
  parseInvoiceFromReference,
  parseSupplierFromReference,
  parseUserNoteFromReference,
} from "@/lib/packaging";
import type { OilProduct } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export function TransactionDetailDialog({
  row,
  open,
  onOpenChange,
}: {
  row: TransactionListRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const product = toProduct(row);
  const packageCount = parsePackageCountFromNote(row.referenceNote);
  const userNote = parseUserNoteFromReference(row.referenceNote);
  const supplier = parseSupplierFromReference(row.referenceNote);
  const invoice = parseInvoiceFromReference(row.referenceNote);
  const litres = Number(row.quantity);
  const packSize = describeBoxPackaging(product) ?? "—";

  const details: Array<{ label: string; value: string }> = [
    { label: "Date", value: formatDate(row.transactionDate) },
    { label: "Oil Type", value: row.productName },
    { label: "Quantity", value: formatLitres(litres) },
    {
      label: "Packages",
      value: packageCount != null ? String(packageCount) : "—",
    },
    { label: "Pack Size", value: packSize },
    { label: "Reference", value: userNote || "—" },
  ];

  if (row.type === "RECEIVE") {
    details.splice(2, 0, { label: "Supplier", value: supplier || "—" });
    details.splice(3, 0, {
      label: "Invoice No.",
      value: invoice || "—",
    });
    details.push({
      label: "Total Cost",
      value: formatInr(litres * Number(row.costPrice)),
    });
  }

  if (row.type === "SALE") {
    details.push({
      label: "Sale Value",
      value: formatInr(litres * Number(row.sellingPrice)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          {details.map((item) => (
            <div key={item.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="text-right font-medium">
                {item.label === "Quantity"
                  ? formatTransactionQuantity(
                      row.type,
                      row.quantity,
                      row.referenceNote,
                      product,
                      row.unit
                    )
                  : item.value}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
