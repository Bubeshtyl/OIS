"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  markReturnedCaseReplacedAction,
  type ActionState,
} from "@/lib/actions/inventory";
import type { OpenReturnedCaseRow } from "@/lib/queries/returned-cases";
import { formatPacketSizeLabel } from "@/lib/products/display";
import { getIstTodayString } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { success: false };

export function MarkReturnedReplacedDialog({
  row,
  open,
  onOpenChange,
}: {
  row: OpenReturnedCaseRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    markReturnedCaseReplacedAction,
    initialState
  );
  const today = getIstTodayString();
  const [replacementInvoice, setReplacementInvoice] = useState("");
  const [transactionDate, setTransactionDate] = useState(today);
  const [casesReplaced, setCasesReplaced] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    setReplacementInvoice("");
    setTransactionDate(today);
    // Default to remaining open qty so partial “one now” is easy to edit down.
    setCasesReplaced(String(row.casesPending));
    setNotes("");
  }, [open, row, today]);

  useEffect(() => {
    if (!state.success && !state.error) return;
    if (state.success) {
      toast.success(state.message);
      onOpenChange(false);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, onOpenChange, router]);

  if (!row) return null;

  const packSize = formatPacketSizeLabel(row.product) ?? "—";

  function handleSubmit(formData: FormData) {
    if (!row) return;
    formData.set("returnedCaseId", row.id);
    formData.set("replacementInvoice", replacementInvoice.trim());
    formData.set("transactionDate", transactionDate);
    formData.set("casesReplaced", casesReplaced);
    if (notes.trim()) formData.set("notes", notes.trim());
    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,28rem)] gap-3 overflow-y-auto p-3 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark replaced</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs leading-snug">
          <p className="font-medium text-sm">{row.productName}</p>
          <p className="text-muted-foreground">
            {row.dealerSource} · Invoice {row.invoice} · {packSize}
          </p>
          <p className="text-muted-foreground">
            {row.casesPending} of {row.casesReturned} case
            {row.casesReturned === 1 ? "" : "s"} still open
            {row.casesReplaced > 0
              ? ` (${row.casesReplaced} already replaced)`
              : ""}
          </p>
        </div>

        <form action={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="replacementInvoice">Replacement invoice *</Label>
            <Input
              id="replacementInvoice"
              value={replacementInvoice}
              onChange={(e) => setReplacementInvoice(e.target.value)}
              placeholder="e.g. BPCL-INV-2102"
              required
              disabled={pending}
              className="h-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="replacementDate">Date *</Label>
              <DatePicker
                id="replacementDate"
                value={transactionDate}
                onChange={setTransactionDate}
                required
                className="h-8 shadow-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="casesReplaced">Cases now *</Label>
              <Input
                id="casesReplaced"
                type="number"
                min={1}
                max={row.casesPending}
                step={1}
                inputMode="numeric"
                value={casesReplaced}
                onChange={(e) => setCasesReplaced(e.target.value)}
                required
                disabled={pending}
                className="h-8"
              />
            </div>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">
            Max {row.casesPending} open case
            {row.casesPending === 1 ? "" : "s"}.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="replacementNotes">Note (optional)</Label>
            <Input
              id="replacementNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note"
              disabled={pending}
              className="h-8"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                pending ||
                !replacementInvoice.trim() ||
                !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)
              }
            >
              {pending ? "Saving…" : "Record replacement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
