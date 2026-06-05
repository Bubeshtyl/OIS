"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reverseTransactionAction } from "@/lib/actions/inventory";
import { formatDate, formatQuantity } from "@/lib/format";
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
}: {
  rows: Array<{
    id: string;
    type: "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL";
    productName: string;
    unit: string;
    quantity: string;
    transactionDate: string;
    referenceNote?: string | null;
    reversesTransactionId?: string | null;
  }>;
  reversedIds: Set<string>;
  isAdmin: boolean;
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
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Note</TableHead>
          {isAdmin && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatDate(row.transactionDate)}</TableCell>
            <TableCell>
              <SegmentBadge type={row.type} />
            </TableCell>
            <TableCell>{row.productName}</TableCell>
            <TableCell>{formatQuantity(row.quantity, row.unit)}</TableCell>
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
