"use client";

import { useState, useTransition } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { reverseTransactionAction } from "@/lib/actions/inventory";
import type { TransactionListRow } from "@/lib/transactions/types";
import { TransactionDetailDialog } from "@/components/transactions/transaction-detail-dialog";
import { Button } from "@/components/ui/button";

export function TransactionActions({
  row,
  isAdmin,
  reversedIds,
}: {
  row: TransactionListRow;
  isAdmin: boolean;
  reversedIds: Set<string>;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const canReverse =
    isAdmin &&
    row.type !== "REVERSAL" &&
    !reversedIds.has(row.id);

  function handleReverse() {
    startTransition(async () => {
      const result = await reverseTransactionAction(row.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setDetailOpen(true)}
          title="View details"
        >
          <Eye className="size-4" />
        </Button>
        {canReverse && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleReverse}
          >
            Reverse
          </Button>
        )}
      </div>
      <TransactionDetailDialog
        row={row}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
