"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { LedgerDiff } from "@/components/shift-closing/ledger-diff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveShiftClosingEditAction,
  rejectShiftClosingEditAction,
} from "@/lib/actions/shift-closing";
import type { EditRequestListItem } from "@/lib/shift-closing/types";
import { formatDateTime } from "@/lib/format";

export function ApprovalQueue({
  requests,
  isAdmin,
}: {
  requests: EditRequestListItem[];
  isAdmin: boolean;
}) {
  const [selected, setSelected] = useState<EditRequestListItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isAdmin) return null;

  function handleApprove() {
    if (!selected) return;
    startTransition(async () => {
      const res = await approveShiftClosingEditAction(
        selected.id,
        reviewNote.trim() || undefined
      );
      if (res.success) {
        toast.success(res.message);
        setSelected(null);
        setReviewNote("");
      } else {
        toast.error(res.error || "Failed to approve.");
      }
    });
  }

  function handleReject() {
    if (!selected) return;
    startTransition(async () => {
      const res = await rejectShiftClosingEditAction(
        selected.id,
        reviewNote.trim() || undefined
      );
      if (res.success) {
        toast.success(res.message);
        setSelected(null);
        setReviewNote("");
      } else {
        toast.error(res.error || "Failed to reject.");
      }
    });
  }

  return (
    <>
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">
              Pending Approvals
            </CardTitle>
            <Badge variant="outline">{requests.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-2">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending edit requests.
            </p>
          ) : (
            requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => {
                  setSelected(request);
                  setReviewNote("");
                }}
                className="w-full rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {request.entityLabel}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {request.entityType.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  By {request.requestedByName || "Unknown"} ·{" "}
                  {formatDateTime(request.requestedAt)}
                </p>
                {request.requestNote ? (
                  <p className="mt-1 text-xs">{request.requestNote}</p>
                ) : null}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Edit Request</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">{selected.entityLabel}</p>
                <p className="text-muted-foreground text-xs">
                  Requested by {selected.requestedByName || "Unknown"} ·{" "}
                  {formatDateTime(selected.requestedAt)}
                </p>
              </div>
              <LedgerDiff
                current={
                  selected.currentData as Record<string, unknown> | null
                }
                proposed={
                  selected.proposedData as unknown as Record<string, unknown>
                }
              />
              <div className="space-y-1.5">
                <Label htmlFor="review-note">Review note (optional)</Label>
                <Textarea
                  id="review-note"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleReject}
                >
                  {isPending ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <X className="mr-1.5 size-3.5" />
                  )}
                  Reject
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handleApprove}
                >
                  {isPending ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 size-3.5" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
