"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type {
  ReceiveDisplayRow,
  ReceiveInvoiceGroup,
} from "@/lib/transactions/group-receive-by-invoice";
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
} from "@/lib/packaging";
import type { OilProduct } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { TransactionActions } from "@/components/transactions/transaction-actions";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function toProduct(row: ReceiveDisplayRow): OilProduct {
  return {
    id: row.productId,
    tenantId: "",
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

function receiveLineCost(
  row: ReceiveDisplayRow,
  litres: number,
  packets: number
) {
  if (row.taxableValue != null) {
    const taxable = Number(row.taxableValue);
    const discount = Number(row.discountAmount ?? 0);
    const cgst = Number(row.cgstAmount ?? 0);
    const sgst = Number(row.sgstAmount ?? 0);
    return taxable - discount + cgst + sgst;
  }
  if (row.landingPrice != null && packets > 0) {
    return Number(row.landingPrice) * packets;
  }
  return litres * Number(row.costPrice);
}

function lineMetrics(row: ReceiveDisplayRow) {
  const litres = Number(row.quantity);
  const packets = transactionRowPackets(row);
  const packageCount = parsePackageCountFromNote(row.referenceNote);
  const returned = row.isReplacementReceive ? null : row.returnedCases;
  const totalCost = receiveLineCost(row, litres, packets);
  const packSize = describeBoxPackaging(toProduct(row)) ?? "—";
  const landingLabel =
    row.landingPrice != null
      ? formatInr(Number(row.landingPrice))
      : row.costPrice && Number(row.costPrice) > 0
        ? formatInr(Number(row.costPrice))
        : "—";
  return {
    litres,
    packets,
    packageCount,
    returned,
    totalCost,
    packSize,
    landingLabel,
  };
}

function ProductLabel({ row }: { row: ReceiveDisplayRow }) {
  if (!row.isReplacementReceive) {
    return <>{row.productName}</>;
  }
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span>{row.productName}</span>
      <span className="text-xs font-normal text-muted-foreground">
        Replacement
        {row.replacementInvoice
          ? ` · invoice ${row.replacementInvoice}`
          : ""}
      </span>
    </span>
  );
}

function ReceiveLineRow({
  row,
  unit,
  nested = false,
}: {
  row: ReceiveDisplayRow;
  unit: StockDisplayUnit;
  nested?: boolean;
}) {
  const m = lineMetrics(row);
  return (
    <TableRow className={cn(nested && "bg-muted/20")}>
      <TableCell
        className={cn(
          "whitespace-nowrap text-muted-foreground",
          nested && "pl-8"
        )}
      >
        {formatDateTime(row.createdAt)}
      </TableCell>
      <TableCell />
      <TableCell className="max-w-[8rem] truncate text-muted-foreground">
        {row.isReplacementReceive ? row.replacementInvoice ?? "—" : ""}
      </TableCell>
      <TableCell className={cn("font-medium", nested && "pl-4")}>
        <ProductLabel row={row} />
      </TableCell>
      <TableCell className="max-w-[10rem] text-xs text-muted-foreground">
        {m.packSize}
      </TableCell>
      <TableCell>{m.packageCount ?? "—"}</TableCell>
      <TableCell>{m.returned ?? "—"}</TableCell>
      <TableCell>
        {formatStockQuantity(unit, m.packets, m.litres)}
      </TableCell>
      <TableCell>{m.landingLabel}</TableCell>
      <TableCell>{formatInr(m.totalCost)}</TableCell>
      <TableCell>
        <TransactionActions row={row} />
      </TableCell>
    </TableRow>
  );
}

function InvoiceGroupRows({
  group,
  unit,
  expanded,
  onToggle,
}: {
  group: ReceiveInvoiceGroup;
  unit: StockDisplayUnit;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasReplacement = group.lines.some((line) => line.isReplacementReceive);
  const originalLines = group.lines.filter((line) => !line.isReplacementReceive);
  const replacementCount = group.lines.length - originalLines.length;

  // Flat row only when a single original line and no replacements.
  if (group.lines.length === 1 && !hasReplacement) {
    const row = group.lines[0];
    const m = lineMetrics(row);
    return (
      <TableRow>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </TableCell>
        <TableCell>{group.supplier}</TableCell>
        <TableCell className="max-w-[8rem] truncate">{group.invoice}</TableCell>
        <TableCell className="font-medium">{row.productName}</TableCell>
        <TableCell className="max-w-[10rem] text-xs text-muted-foreground">
          {m.packSize}
        </TableCell>
        <TableCell>{m.packageCount ?? "—"}</TableCell>
        <TableCell>{m.returned ?? "—"}</TableCell>
        <TableCell>
          {formatStockQuantity(unit, m.packets, m.litres)}
        </TableCell>
        <TableCell>{m.landingLabel}</TableCell>
        <TableCell>{formatInr(m.totalCost)}</TableCell>
        <TableCell>
          <TransactionActions row={row} />
        </TableCell>
      </TableRow>
    );
  }

  const totals = group.lines.reduce(
    (acc, row) => {
      const m = lineMetrics(row);
      acc.packages += m.packageCount ?? 0;
      if (!row.isReplacementReceive) {
        acc.returned += m.returned ?? 0;
      }
      acc.packets += m.packets;
      acc.litres += m.litres;
      acc.totalCost += m.totalCost;
      return acc;
    },
    { packages: 0, returned: 0, packets: 0, litres: 0, totalCost: 0 }
  );

  const productCount = new Set(originalLines.map((line) => line.productId)).size;
  const linesLabel =
    productCount > 0
      ? `${productCount} product${productCount === 1 ? "" : "s"}`
      : `${group.lines.length} line${group.lines.length === 1 ? "" : "s"}`;
  const replacementLabel =
    replacementCount > 0
      ? ` · ${replacementCount} replacement${replacementCount === 1 ? "" : "s"}`
      : "";

  const editHref =
    group.dealerSource === "BPCL" && group.invoice !== "—"
      ? `/receive/bpcl/edit?invoice=${encodeURIComponent(group.invoice)}`
      : null;

  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/40">
        <TableCell className="whitespace-nowrap text-muted-foreground">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 text-left"
            aria-expanded={expanded}
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-transform",
                expanded ? "rotate-0" : "-rotate-90"
              )}
            />
            {formatDateTime(group.latestCreatedAt)}
          </button>
        </TableCell>
        <TableCell>{group.supplier}</TableCell>
        <TableCell className="max-w-[8rem] truncate font-medium">
          {group.invoice}
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={onToggle}
            className="text-left font-medium"
          >
            {linesLabel}
            <span className="text-xs font-normal text-muted-foreground">
              {replacementLabel}
            </span>
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {expanded ? "Hide" : "Show"} lines
            </span>
          </button>
        </TableCell>
        <TableCell className="text-muted-foreground">—</TableCell>
        <TableCell>{totals.packages || "—"}</TableCell>
        <TableCell>{totals.returned || "—"}</TableCell>
        <TableCell>
          {formatStockQuantity(unit, totals.packets, totals.litres)}
        </TableCell>
        <TableCell className="text-muted-foreground">—</TableCell>
        <TableCell>{formatInr(totals.totalCost)}</TableCell>
        <TableCell>
          {editHref ? (
            <Link
              href={editHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Edit invoice
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {expanded
        ? group.lines.map((row) => (
            <ReceiveLineRow key={row.id} row={row} unit={unit} nested />
          ))
        : null}
    </>
  );
}

export function ReceiveTransactionTable({
  groups,
  unit = "packets",
}: {
  groups: ReceiveInvoiceGroup[];
  unit?: StockDisplayUnit;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  if (groups.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No receipts found for the selected filters.
      </p>
    );
  }

  function toggle(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
          <TableHead>Returned Qty (cases)</TableHead>
          <TableHead className="min-w-[4.5rem]">Total</TableHead>
          <TableHead>Landing / piece</TableHead>
          <TableHead>Total Cost</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <InvoiceGroupRows
            key={group.key}
            group={group}
            unit={unit}
            expanded={expandedKeys.has(group.key)}
            onToggle={() => toggle(group.key)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
