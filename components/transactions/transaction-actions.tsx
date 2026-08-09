"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import type { TransactionListRow } from "@/lib/transactions/types";
import {
  isReplacementReceiveNote,
  parseInvoiceFromReference,
} from "@/lib/packaging";
import { TransactionDetailDialog } from "@/components/transactions/transaction-detail-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TransactionActions({ row }: { row: TransactionListRow }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const isReplacement = isReplacementReceiveNote(row.referenceNote);
  const invoice =
    row.dealerSource === "BPCL" && !isReplacement
      ? parseInvoiceFromReference(row.referenceNote)
      : null;

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
        {invoice ? (
          <Link
            href={`/receive/bpcl/edit?invoice=${encodeURIComponent(invoice)}`}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
            title="Edit invoice"
          >
            <Pencil className="size-4" />
          </Link>
        ) : null}
      </div>
      <TransactionDetailDialog
        row={row}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
