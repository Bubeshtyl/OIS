"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ApprovalQueue } from "@/components/shift-closing/approval-queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getShiftClosingDetailAction,
  submitShiftClosingEditRequestAction,
} from "@/lib/actions/shift-closing";
import type {
  EditRequestListItem,
  InterimShiftClosingDetail,
  InterimShiftClosingProposedData,
} from "@/lib/shift-closing/types";
import { interimDetailToProposed } from "@/lib/shift-closing/types";
import { formatDate, formatDateTime, formatInr, formatLitres } from "@/lib/format";

type SlipRow = {
  id: string;
  entryDate: string;
  machineNumber: string;
  nozzleNumber: number;
  reading: string;
  revision: number;
  recorderName: string | null;
  updatedAt: Date;
};

type InterimRow = {
  id: string;
  pumpNumber: number;
  pumpName: string;
  shiftDate: Date;
  totalSalesAmount: string;
  totalCollected: string;
  difference: string;
  revision: number;
  staffName: string | null;
  createdAt: Date;
};

export function ShiftClosingLedger({
  slipRows,
  interimRows,
  pendingRequests,
  isAdmin,
}: {
  slipRows: SlipRow[];
  interimRows: InterimRow[];
  pendingRequests: EditRequestListItem[];
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<"slips" | "interim">("slips");
  const [slipFilter, setSlipFilter] = useState({ machine: "", from: "", to: "" });
  const [interimFilter, setInterimFilter] = useState({ pump: "", from: "", to: "" });

  const [slipEdit, setSlipEdit] = useState<SlipRow | null>(null);
  const [slipReading, setSlipReading] = useState("");
  const [slipNote, setSlipNote] = useState("");

  const [interimDetail, setInterimDetail] =
    useState<InterimShiftClosingDetail | null>(null);
  const [interimEdit, setInterimEdit] =
    useState<InterimShiftClosingProposedData | null>(null);
  const [interimNote, setInterimNote] = useState("");
  const [interimEntityId, setInterimEntityId] = useState<string | null>(null);

  const [isLoadingDetail, startLoadingDetail] = useTransition();
  const [isSubmittingSlip, startSubmittingSlip] = useTransition();
  const [isSubmittingInterim, startSubmittingInterim] = useTransition();

  const filteredSlips = useMemo(() => {
    return slipRows.filter((row) => {
      if (slipFilter.machine && row.machineNumber !== slipFilter.machine) {
        return false;
      }
      if (slipFilter.from && row.entryDate < slipFilter.from) return false;
      if (slipFilter.to && row.entryDate > slipFilter.to) return false;
      return true;
    });
  }, [slipRows, slipFilter]);

  const filteredInterim = useMemo(() => {
    return interimRows.filter((row) => {
      if (interimFilter.pump && String(row.pumpNumber) !== interimFilter.pump) {
        return false;
      }
      const dateStr = row.shiftDate.toISOString().slice(0, 10);
      if (interimFilter.from && dateStr < interimFilter.from) return false;
      if (interimFilter.to && dateStr > interimFilter.to) return false;
      return true;
    });
  }, [interimRows, interimFilter]);

  function openSlipEdit(row: SlipRow) {
    setSlipEdit(row);
    setSlipReading(row.reading);
    setSlipNote("");
  }

  function handleSlipEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slipEdit) return;
    startSubmittingSlip(async () => {
      const res = await submitShiftClosingEditRequestAction({
        entityType: "machine_slip_entry",
        entityId: slipEdit.id,
        proposedData: {
          entryDate: slipEdit.entryDate,
          machineNumber: slipEdit.machineNumber,
          nozzleNumber: slipEdit.nozzleNumber,
          reading: slipReading,
        },
        note: slipNote.trim() || undefined,
      });
      if (res.success) {
        toast.success(res.message);
        setSlipEdit(null);
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to submit edit request.");
      }
    });
  }

  function openInterim(id: string, mode: "view" | "edit") {
    startLoadingDetail(async () => {
      const res = await getShiftClosingDetailAction("interim", id);
      if (!res.success) {
        toast.error(res.error || "Failed to load entry.");
        return;
      }
      if (mode === "view") {
        setInterimDetail(res.data);
        setInterimEdit(null);
        setInterimEntityId(null);
        return;
      }
      setInterimDetail(null);
      setInterimEntityId(id);
      setInterimEdit(interimDetailToProposed(res.data));
      setInterimNote("");
    });
  }

  function handleInterimEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!interimEntityId || !interimEdit) return;
    startSubmittingInterim(async () => {
      const res = await submitShiftClosingEditRequestAction({
        entityType: "interim_shift_closing",
        entityId: interimEntityId,
        proposedData: interimEdit,
        note: interimNote.trim() || undefined,
      });
      if (res.success) {
        toast.success(res.message);
        setInterimEdit(null);
        setInterimEntityId(null);
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
          <CardContent className="p-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "slips" | "interim")}>
              <TabsList>
                <TabsTrigger value="slips">Machine Slips</TabsTrigger>
                <TabsTrigger value="interim">Interim Closings</TabsTrigger>
              </TabsList>

              <TabsContent value="slips" className="space-y-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    aria-label="Machine number"
                    value={slipFilter.machine}
                    onChange={(e) =>
                      setSlipFilter((f) => ({ ...f, machine: e.target.value }))
                    }
                  />
                  <DateRangePicker
                    startDate={slipFilter.from}
                    endDate={slipFilter.to}
                    onChange={({ start, end }) =>
                      setSlipFilter((f) => ({ ...f, from: start, to: end }))
                    }
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Nozzle</TableHead>
                      <TableHead>Reading</TableHead>
                      <TableHead>Rev</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSlips.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No slip entries found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSlips.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.entryDate)}</TableCell>
                          <TableCell>{row.machineNumber}</TableCell>
                          <TableCell>{row.nozzleNumber}</TableCell>
                          <TableCell className="tabular-nums">{row.reading}</TableCell>
                          <TableCell>
                            <Badge variant="outline">v{row.revision}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openSlipEdit(row)}
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
              </TabsContent>

              <TabsContent value="interim" className="space-y-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    aria-label="Pump number"
                    value={interimFilter.pump}
                    onChange={(e) =>
                      setInterimFilter((f) => ({ ...f, pump: e.target.value }))
                    }
                  />
                  <DateRangePicker
                    startDate={interimFilter.from}
                    endDate={interimFilter.to}
                    onChange={({ start, end }) =>
                      setInterimFilter((f) => ({ ...f, from: start, to: end }))
                    }
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Pump</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Diff</TableHead>
                      <TableHead>Rev</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInterim.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground">
                          No interim closings found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInterim.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            {formatDateTime(row.shiftDate)}
                          </TableCell>
                          <TableCell>
                            {row.pumpName} (#{row.pumpNumber})
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatInr(row.totalSalesAmount)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatInr(row.totalCollected)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatInr(row.difference)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">v{row.revision}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={isLoadingDetail}
                              onClick={() => openInterim(row.id, "view")}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isLoadingDetail}
                              onClick={() => openInterim(row.id, "edit")}
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <ApprovalQueue
          requests={pendingRequests.filter(
            (r) =>
              r.entityType === "machine_slip_entry" ||
              r.entityType === "interim_shift_closing"
          )}
          isAdmin={isAdmin}
        />
      </div>

      <Dialog open={!!slipEdit} onOpenChange={(open) => !open && setSlipEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Slip Edit</DialogTitle>
          </DialogHeader>
          {slipEdit ? (
            <form onSubmit={handleSlipEditSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {formatDate(slipEdit.entryDate)} · {slipEdit.machineNumber} ·
                Nozzle {slipEdit.nozzleNumber}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="slip-reading">Reading</Label>
                <Input
                  id="slip-reading"
                  type="number"
                  step="any"
                  value={slipReading}
                  onChange={(e) => setSlipReading(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slip-note">Reason (optional)</Label>
                <Textarea
                  id="slip-note"
                  value={slipNote}
                  onChange={(e) => setSlipNote(e.target.value)}
                  rows={2}
                />
              </div>
              <Button type="submit" disabled={isSubmittingSlip}>
                {isSubmittingSlip ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : null}
                Submit for approval
              </Button>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!interimDetail && !interimEdit}
        onOpenChange={(open) => !open && setInterimDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Interim Closing Detail</DialogTitle>
          </DialogHeader>
          {interimDetail ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p>
                  <span className="text-muted-foreground">Pump:</span>{" "}
                  {interimDetail.pumpName} (#{interimDetail.pumpNumber})
                </p>
                <p>
                  <span className="text-muted-foreground">Staff:</span>{" "}
                  {interimDetail.staffName || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Sales:</span>{" "}
                  {formatInr(interimDetail.totalSalesAmount)}
                </p>
                <p>
                  <span className="text-muted-foreground">Collected:</span>{" "}
                  {formatInr(interimDetail.totalCollected)}
                </p>
                <p>
                  <span className="text-muted-foreground">Difference:</span>{" "}
                  {formatInr(interimDetail.difference)}
                </p>
                <p>
                  <span className="text-muted-foreground">Revision:</span> v
                  {interimDetail.revision}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nozzle</TableHead>
                    <TableHead>Open</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interimDetail.nozzleReadings.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>{n.nozzleName}</TableCell>
                      <TableCell>{n.openingReading}</TableCell>
                      <TableCell>{n.closingReading}</TableCell>
                      <TableCell>{n.testVolume}</TableCell>
                      <TableCell>{formatLitres(n.netVolume)}</TableCell>
                      <TableCell>
                        {n.salesAmount != null ? formatInr(n.salesAmount) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!interimEdit}
        onOpenChange={(open) => {
          if (!open) {
            setInterimEdit(null);
            setInterimEntityId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Interim Edit</DialogTitle>
          </DialogHeader>
          {interimEdit ? (
            <form onSubmit={handleInterimEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Total sales</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={interimEdit.totalSalesAmount}
                    onChange={(e) =>
                      setInterimEdit((d) =>
                        d
                          ? {
                              ...d,
                              totalSalesAmount: Number(e.target.value) || 0,
                            }
                          : d
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total collected</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={interimEdit.totalCollected}
                    onChange={(e) =>
                      setInterimEdit((d) =>
                        d
                          ? {
                              ...d,
                              totalCollected: Number(e.target.value) || 0,
                            }
                          : d
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Difference</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={interimEdit.difference}
                    onChange={(e) =>
                      setInterimEdit((d) =>
                        d
                          ? {
                              ...d,
                              difference: Number(e.target.value) || 0,
                            }
                          : d
                      )
                    }
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nozzle</TableHead>
                    <TableHead>Close</TableHead>
                    <TableHead>Test</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interimEdit.nozzleReadings.map((n, index) => (
                    <TableRow key={`${n.nozzleName}-${index}`}>
                      <TableCell>{n.nozzleName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          value={n.closingReading}
                          onChange={(e) =>
                            setInterimEdit((d) => {
                              if (!d) return d;
                              const nozzleReadings = [...d.nozzleReadings];
                              const closing = Number(e.target.value) || 0;
                              const opening = nozzleReadings[index].openingReading;
                              const test = nozzleReadings[index].testVolume;
                              const net = Math.max(0, closing - opening - test);
                              nozzleReadings[index] = {
                                ...nozzleReadings[index],
                                closingReading: closing,
                                netVolume: net,
                              };
                              return { ...d, nozzleReadings };
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          value={n.testVolume}
                          onChange={(e) =>
                            setInterimEdit((d) => {
                              if (!d) return d;
                              const nozzleReadings = [...d.nozzleReadings];
                              const test = Number(e.target.value) || 0;
                              const opening = nozzleReadings[index].openingReading;
                              const closing = nozzleReadings[index].closingReading;
                              const net = Math.max(0, closing - opening - test);
                              nozzleReadings[index] = {
                                ...nozzleReadings[index],
                                testVolume: test,
                                netVolume: net,
                              };
                              return { ...d, nozzleReadings };
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="space-y-1.5">
                <Label htmlFor="interim-note">Reason (optional)</Label>
                <Textarea
                  id="interim-note"
                  value={interimNote}
                  onChange={(e) => setInterimNote(e.target.value)}
                  rows={2}
                />
              </div>
              <Button type="submit" disabled={isSubmittingInterim}>
                {isSubmittingInterim ? (
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
