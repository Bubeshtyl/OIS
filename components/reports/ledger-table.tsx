"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reverseTransactionAction } from "@/lib/actions/inventory";
import {
  formatDateTime,
  formatStockQuantity,
  type StockDisplayUnit,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { ledgerRowPackets } from "@/lib/transactions/quantity";
import { SegmentBadge } from "@/components/shared/page-blocks";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function LedgerTable({
  rows,
  reversedIds,
  isAdmin,
  unit = "packets",
}: {
  rows: Array<{
    id: string;
    type:
      | "RECEIVE"
      | "TRANSFER"
      | "SALE"
      | "RETURNED"
      | "DAMAGED"
      | "REVERSAL";
    productName: string;
    unit: string;
    quantity: string;
    createdAt: Date;
    referenceNote?: string | null;
    reversesTransactionId?: string | null;
    packetsPerBox?: string | null;
    volumePerPacket?: string | null;
  }>;
  reversedIds: Set<string>;
  isAdmin: boolean;
  unit?: StockDisplayUnit;
}) {
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleReverse = (id: string) => {
    setActiveId(id);
    startTransition(async () => {
      const result = await reverseTransactionAction(id);
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
      setActiveId(null);
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recorded</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="min-w-[4.5rem]">Qty</TableHead>
          <TableHead>Note</TableHead>
          {isAdmin && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDateTime(row.createdAt)}
            </TableCell>
            <TableCell>
              <SegmentBadge type={row.type} />
            </TableCell>
            <TableCell>{row.productName}</TableCell>
            <TableCell
              className={cn(
                row.type === "DAMAGED" && "font-medium text-destructive"
              )}
            >
              {formatStockQuantity(
                unit,
                ledgerRowPackets(row),
                Number(row.quantity)
              )}
            </TableCell>
            <TableCell className="max-w-32 truncate text-muted-foreground">
              {row.referenceNote || "—"}
            </TableCell>
            {isAdmin && (
              <TableCell>
                {row.type !== "REVERSAL" &&
                  !reversedIds.has(row.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending && activeId === row.id}
                      onClick={() => handleReverse(row.id)}
                    >
                      Reverse
                    </Button>
                  )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
