"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
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
import { cancelShiftClosingEditRequestAction } from "@/lib/actions/shift-closing";
import type { EditRequestListItem } from "@/lib/shift-closing/types";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

function statusBadgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200";
    case "approved":
      return "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-200";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "";
  }
}

export function MyEditRequests({
  requests,
  currentUserId,
  isAdmin = false,
}: {
  requests: EditRequestListItem[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const [selected, setSelected] = useState<EditRequestListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const title = isAdmin ? "Recent Requests" : "My Requests";
  const emptyMessage = isAdmin
    ? "No edit requests yet."
    : "No edit requests submitted yet.";

  function handleCancel(requestId: string) {
    startTransition(async () => {
      const res = await cancelShiftClosingEditRequestAction(requestId);
      if (res.success) {
        toast.success(res.message);
        setSelected(null);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to cancel request.");
      }
    });
  }

  function canCancel(request: EditRequestListItem) {
    return (
      request.status === "pending" &&
      request.requestedByUserId === currentUserId
    );
  }

  return (
    <>
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-2">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            requests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelected(request)}
                className="w-full rounded-lg border p-3 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-snug">
                    {request.entityLabel}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0 capitalize",
                      statusBadgeClass(request.status)
                    )}
                  >
                    {request.status}
                  </Badge>
                </div>
                {isAdmin ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    By {request.requestedByName || "Unknown"}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted {formatDateTime(request.requestedAt)}
                </p>
                {request.status !== "pending" && request.reviewedAt ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Reviewed {formatDateTime(request.reviewedAt)}
                    {request.reviewedByName ? ` by ${request.reviewedByName}` : ""}
                  </p>
                ) : null}
                {request.reviewNote ? (
                  <p className="mt-1 text-xs line-clamp-2">{request.reviewNote}</p>
                ) : null}
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAdmin ? "Edit Request" : "My Edit Request"}
            </DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{selected.entityLabel}</span>
                <Badge
                  variant="outline"
                  className={cn("capitalize", statusBadgeClass(selected.status))}
                >
                  {selected.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? (
                  <>
                    Requested by {selected.requestedByName || "Unknown"} ·{" "}
                  </>
                ) : null}
                Submitted {formatDateTime(selected.requestedAt)}
                {selected.reviewedAt
                  ? ` · Reviewed ${formatDateTime(selected.reviewedAt)}${
                      selected.reviewedByName ? ` by ${selected.reviewedByName}` : ""
                    }`
                  : ""}
              </p>
              {selected.requestNote ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Request note:</span>{" "}
                  {selected.requestNote}
                </p>
              ) : null}
              {selected.reviewNote ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Reviewer note:</span>{" "}
                  {selected.reviewNote}
                </p>
              ) : null}
              <LedgerDiff
                current={selected.currentData as Record<string, unknown> | null}
                proposed={
                  selected.proposedData as unknown as Record<string, unknown>
                }
              />
              {canCancel(selected) ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleCancel(selected.id)}
                  >
                    {isPending ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <X className="mr-1.5 size-3.5" />
                    )}
                    Cancel request
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
