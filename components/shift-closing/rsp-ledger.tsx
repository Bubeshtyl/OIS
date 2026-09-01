"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ApprovalQueue } from "@/components/shift-closing/approval-queue";
import { MyEditRequests } from "@/components/shift-closing/my-edit-requests";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { submitShiftClosingEditRequestAction } from "@/lib/actions/shift-closing";
import { cn } from "@/lib/utils";
import type { EditRequestListItem } from "@/lib/shift-closing/types";
import { formatDate, formatDateTime } from "@/lib/format";

type RspRow = {
  id: string;
  priceDate: string;
  hsdPrice: string;
  msPrice: string;
  speedPrice: string;
  revision: number;
  recorderName: string | null;
  updatedAt: Date;
};

export function RspLedger({
  initialRows,
  pendingRequests,
  requestHistory,
  isAdmin,
  currentUserId,
}: {
  initialRows: RspRow[];
  pendingRequests: EditRequestListItem[];
  requestHistory: EditRequestListItem[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [rows] = useState(initialRows);
  const [editRow, setEditRow] = useState<RspRow | null>(null);
  const [editPrices, setEditPrices] = useState({ hsd: "", ms: "", speed: "" });
  const [editNote, setEditNote] = useState("");
  const [isSubmittingEdit, startSubmittingEdit] = useTransition();

  function openEdit(row: RspRow) {
    setEditRow(row);
    setEditPrices({
      hsd: row.hsdPrice,
      ms: row.msPrice,
      speed: row.speedPrice,
    });
    setEditNote("");
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    startSubmittingEdit(async () => {
      const res = await submitShiftClosingEditRequestAction({
        entityType: "daily_rsp",
        entityId: editRow.id,
        proposedData: {
          priceDate: editRow.priceDate,
          hsdPrice: editPrices.hsd,
          msPrice: editPrices.ms,
          speedPrice: editPrices.speed,
        },
        note: editNote.trim() || undefined,
      });
      if (res.success) {
        toast.success(res.message);
        setEditRow(null);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to submit edit request.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">RSP Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>HSD</TableHead>
                  <TableHead>MS</TableHead>
                  <TableHead>SPEED</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No RSP entries yet.{" "}
                      <Link
                        href="/shift-closing/6am"
                        className={cn(
                          buttonVariants({ variant: "link", size: "sm" }),
                          "h-auto p-0"
                        )}
                      >
                        Add RSP on 6 AM
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.priceDate)}</TableCell>
                      <TableCell className="tabular-nums">₹{row.hsdPrice}</TableCell>
                      <TableCell className="tabular-nums">₹{row.msPrice}</TableCell>
                      <TableCell className="tabular-nums">₹{row.speedPrice}</TableCell>
                      <TableCell>
                        <Badge variant="outline">v{row.revision}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(row.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="mr-1 size-3.5" />
                          Request edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ApprovalQueue requests={pendingRequests} isAdmin={isAdmin} />
          <MyEditRequests
            requests={requestHistory}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request RSP Edit</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Changes for {formatDate(editRow.priceDate)} require admin approval.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-hsd">HSD</Label>
                  <Input
                    id="edit-hsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrices.hsd}
                    onChange={(e) =>
                      setEditPrices((p) => ({ ...p, hsd: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-ms">MS</Label>
                  <Input
                    id="edit-ms"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrices.ms}
                    onChange={(e) =>
                      setEditPrices((p) => ({ ...p, ms: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-speed">SPEED</Label>
                  <Input
                    id="edit-speed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrices.speed}
                    onChange={(e) =>
                      setEditPrices((p) => ({ ...p, speed: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-note">Reason (optional)</Label>
                <Textarea
                  id="edit-note"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                />
              </div>
              <Button type="submit" disabled={isSubmittingEdit}>
                {isSubmittingEdit ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                Submit for approval
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
