"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  fetchSixAmDataForDateAction,
  saveDailyRspAction,
  saveMachineSlipEntriesAction,
} from "@/lib/actions/six-am";

interface SlipEntryGroup {
  id: string;
  title: string;
  machineNumber: string;
  nozzles: Array<{ id: string; label: string; nozzleNumber: number }>;
}

const SLIP_GROUPS: SlipEntryGroup[] = [
  {
    id: "group-1",
    title: "202206000654",
    machineNumber: "202206000654",
    nozzles: [
      { id: "g1-n1", label: "Nozzle 1", nozzleNumber: 1 },
      { id: "g1-n2", label: "Nozzle 2", nozzleNumber: 2 },
      { id: "g1-n3", label: "Nozzle 3", nozzleNumber: 3 },
      { id: "g1-n4", label: "Nozzle 4", nozzleNumber: 4 },
    ],
  },
  {
    id: "group-2",
    title: "M2446157",
    machineNumber: "M2446157",
    nozzles: [
      { id: "g2-n1", label: "Nozzle 1", nozzleNumber: 1 },
      { id: "g2-n2", label: "Nozzle 2", nozzleNumber: 2 },
      { id: "g2-n3", label: "Nozzle 3", nozzleNumber: 3 },
      { id: "g2-n4", label: "Nozzle 4", nozzleNumber: 4 },
      { id: "g2-n5", label: "Nozzle 5", nozzleNumber: 5 },
      { id: "g2-n6", label: "Nozzle 6", nozzleNumber: 6 },
    ],
  },
  {
    id: "group-3",
    title: "202206000650",
    machineNumber: "202206000650",
    nozzles: [
      { id: "g3-n1", label: "Nozzle 1", nozzleNumber: 1 },
      { id: "g3-n2", label: "Nozzle 2", nozzleNumber: 2 },
      { id: "g3-n3", label: "Nozzle 3", nozzleNumber: 3 },
      { id: "g3-n4", label: "Nozzle 4", nozzleNumber: 4 },
    ],
  },
];

function slipKey(machineNumber: string, nozzleNumber: number) {
  return `${machineNumber}:${nozzleNumber}`;
}

function buildSlipReadingsMap(
  slips?: Array<{ machineNumber: string; nozzleNumber: number; reading: string }>
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!slips) return map;

  for (const group of SLIP_GROUPS) {
    for (const nozzle of group.nozzles) {
      const match = slips.find(
        (s) =>
          s.machineNumber === group.machineNumber &&
          s.nozzleNumber === nozzle.nozzleNumber
      );
      if (match) {
        map[nozzle.id] = match.reading;
      }
    }
  }
  return map;
}

function buildExistingSlipKeys(
  slips?: Array<{ machineNumber: string; nozzleNumber: number; reading: string }>
) {
  const keys = new Set<string>();
  for (const slip of slips ?? []) {
    keys.add(slipKey(slip.machineNumber, slip.nozzleNumber));
  }
  return keys;
}

export function SixAmShiftClosingForm({
  initialDate,
  initialRsp,
  initialSlips,
}: {
  initialDate: string;
  initialRsp?: { hsd: string; ms: string; speed: string } | null;
  initialSlips?: Array<{
    machineNumber: string;
    nozzleNumber: number;
    reading: string;
  }>;
}) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [prices, setPrices] = useState({
    ms: initialRsp?.ms || "",
    hsd: initialRsp?.hsd || "",
    speed: initialRsp?.speed || "",
  });
  const [hasRecordedRsp, setHasRecordedRsp] = useState(Boolean(initialRsp));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "group-1": true,
    "group-2": false,
    "group-3": false,
  });
  const [slipReadings, setSlipReadings] = useState<Record<string, string>>(() =>
    buildSlipReadingsMap(initialSlips)
  );
  const [existingSlipKeys, setExistingSlipKeys] = useState<Set<string>>(() =>
    buildExistingSlipKeys(initialSlips)
  );

  const [isSavingRsp, startSavingRsp] = useTransition();
  const [isSavingSlips, startSavingSlips] = useTransition();
  const [isLoadingDate, startLoadingDate] = useTransition();

  const hasRecordedSlips = existingSlipKeys.size > 0;

  const newEntriesCount = useMemo(() => {
    let count = 0;
    for (const group of SLIP_GROUPS) {
      for (const nozzle of group.nozzles) {
        const key = slipKey(group.machineNumber, nozzle.nozzleNumber);
        const val = slipReadings[nozzle.id];
        if (val && val.trim() !== "" && !existingSlipKeys.has(key)) {
          count += 1;
        }
      }
    }
    return count;
  }, [slipReadings, existingSlipKeys]);

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    startLoadingDate(async () => {
      const data = await fetchSixAmDataForDateAction(newDate);
      if (data.rsp) {
        setPrices({
          hsd: data.rsp.hsdPrice,
          ms: data.rsp.msPrice,
          speed: data.rsp.speedPrice,
        });
        setHasRecordedRsp(true);
      } else {
        setPrices({ hsd: "", ms: "", speed: "" });
        setHasRecordedRsp(false);
      }

      const mappedSlips =
        data.slips?.map((s) => ({
          machineNumber: s.machineNumber,
          nozzleNumber: s.nozzleNumber,
          reading: s.reading,
        })) ?? [];

      setSlipReadings(buildSlipReadingsMap(mappedSlips));
      setExistingSlipKeys(buildExistingSlipKeys(mappedSlips));
    });
  }

  function handleRspSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasRecordedRsp) {
      toast.error("RSP for this date is already recorded. Request edits from the RSP Ledger.");
      return;
    }
    if (!prices.ms || !prices.hsd || !prices.speed) {
      toast.error("Please enter daily prices for HSD, MS, and SPEED.");
      return;
    }

    startSavingRsp(async () => {
      const res = await saveDailyRspAction({
        priceDate: selectedDate,
        hsdPrice: prices.hsd,
        msPrice: prices.ms,
        speedPrice: prices.speed,
      });

      if (res.success) {
        setHasRecordedRsp(true);
        toast.success(res.message || "RSP fuel prices saved successfully!");
      } else {
        toast.error(res.error || "Failed to save RSP prices.");
      }
    });
  }

  function handleRspReset() {
    if (hasRecordedRsp) return;
    setPrices({ ms: "", hsd: "", speed: "" });
    toast.info("Reset fuel price inputs.");
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function handleSlipInputChange(nozzleId: string, value: string) {
    setSlipReadings((prev) => ({
      ...prev,
      [nozzleId]: value,
    }));
  }

  function handleSlipSubmit(e: React.FormEvent) {
    e.preventDefault();

    const entriesToSave: Array<{
      machineNumber: string;
      nozzleNumber: number;
      reading: string;
    }> = [];

    for (const group of SLIP_GROUPS) {
      for (const nozzle of group.nozzles) {
        const key = slipKey(group.machineNumber, nozzle.nozzleNumber);
        const val = slipReadings[nozzle.id];
        if (val && val.trim() !== "" && !existingSlipKeys.has(key)) {
          entriesToSave.push({
            machineNumber: group.machineNumber,
            nozzleNumber: nozzle.nozzleNumber,
            reading: val.trim(),
          });
        }
      }
    }

    if (entriesToSave.length === 0) {
      toast.error(
        hasRecordedSlips
          ? "Recorded readings are locked. Request edits from the Ledger."
          : "Please enter at least one slip reading before saving."
      );
      return;
    }

    startSavingSlips(async () => {
      const res = await saveMachineSlipEntriesAction({
        entryDate: selectedDate,
        entries: entriesToSave,
      });

      if (res.success) {
        toast.success(res.message || "Slip entries saved successfully!");
        handleDateChange(selectedDate);
      } else {
        toast.error(res.error || "Failed to save slip entries.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">RSP</CardTitle>
            {hasRecordedRsp ? (
              <Badge
                variant="outline"
                className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                Recorded for {selectedDate}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {hasRecordedRsp ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              RSP for {selectedDate} is already in the ledger and cannot be changed
              here.{" "}
              <Link
                href="/shift-closing/rsp"
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "h-auto p-0 inline-flex items-center gap-1"
                )}
              >
                Request edits from RSP Ledger
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          ) : null}

          <form onSubmit={handleRspSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Date</Label>
                <DatePicker
                  value={selectedDate}
                  onChange={handleDateChange}
                  today={initialDate}
                  className="h-10 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-hsd" className="text-xs font-semibold text-foreground">
                    HSD
                  </Label>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    Diesel
                  </Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="price-hsd"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={prices.hsd}
                    onChange={(e) =>
                      setPrices((prev) => ({ ...prev, hsd: e.target.value }))
                    }
                    readOnly={hasRecordedRsp}
                    required
                    className={cn(
                      "h-10 pl-7 text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                      hasRecordedRsp && "bg-muted/50"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-ms" className="text-xs font-semibold text-foreground">
                    MS
                  </Label>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    Petrol
                  </Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="price-ms"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={prices.ms}
                    onChange={(e) =>
                      setPrices((prev) => ({ ...prev, ms: e.target.value }))
                    }
                    readOnly={hasRecordedRsp}
                    required
                    className={cn(
                      "h-10 pl-7 text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                      hasRecordedRsp && "bg-muted/50"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-speed" className="text-xs font-semibold text-foreground">
                    SPEED
                  </Label>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                  >
                    Speed
                  </Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="price-speed"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={prices.speed}
                    onChange={(e) =>
                      setPrices((prev) => ({ ...prev, speed: e.target.value }))
                    }
                    readOnly={hasRecordedRsp}
                    required
                    className={cn(
                      "h-10 pl-7 text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                      hasRecordedRsp && "bg-muted/50"
                    )}
                  />
                </div>
              </div>
            </div>

            {!hasRecordedRsp ? (
              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingRsp || isLoadingDate}
                  className="h-9 w-full sm:w-auto px-6 text-xs font-semibold"
                >
                  {isSavingRsp ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                  )}
                  Save RSP
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSavingRsp || isLoadingDate}
                  onClick={handleRspReset}
                  className="h-9 w-full sm:w-auto px-5 text-xs font-semibold"
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  Reset
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">6 AM Slip Entry</CardTitle>
            <div className="flex items-center gap-2">
              {hasRecordedSlips ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  {existingSlipKeys.size} recorded
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {hasRecordedSlips ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              Some readings for {selectedDate} are already in the ledger and cannot
              be changed here.{" "}
              <Link
                href="/shift-closing/ledger"
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "h-auto p-0 inline-flex items-center gap-1"
                )}
              >
                Request edits from Ledger
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          ) : null}

          <form onSubmit={handleSlipSubmit} className="space-y-4">
            <div className="space-y-3">
              {SLIP_GROUPS.map((group) => {
                const isOpen = Boolean(openGroups[group.id]);

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border bg-card transition-all shadow-2xs overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-left font-medium text-sm transition-colors cursor-pointer",
                        isOpen
                          ? "bg-muted/50 border-b text-foreground"
                          : "hover:bg-muted/30 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="size-4 text-muted-foreground transition-transform" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground transition-transform" />
                        )}
                        <span className="font-semibold text-sm">{group.title}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {group.nozzles.map((nozzle) => {
                            const key = slipKey(
                              group.machineNumber,
                              nozzle.nozzleNumber
                            );
                            const isLocked = existingSlipKeys.has(key);

                            return (
                              <div key={nozzle.id} className="space-y-1.5">
                                <Label
                                  htmlFor={nozzle.id}
                                  className="text-xs font-medium text-foreground"
                                >
                                  {nozzle.label}
                                  {isLocked ? (
                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                      (recorded)
                                    </span>
                                  ) : null}
                                </Label>
                                <Input
                                  id={nozzle.id}
                                  type="number"
                                  step="any"
                                  value={slipReadings[nozzle.id] ?? ""}
                                  onChange={(e) =>
                                    handleSlipInputChange(nozzle.id, e.target.value)
                                  }
                                  readOnly={isLocked}
                                  className={cn(
                                    "h-10 text-center text-sm font-medium tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                    isLocked && "bg-muted/50"
                                  )}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <Button
                type="submit"
                size="sm"
                disabled={
                  isSavingSlips || isLoadingDate || newEntriesCount === 0
                }
                className="h-9 w-full sm:w-auto px-6 text-xs font-semibold"
              >
                {isSavingSlips ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-3.5" />
                )}
                Save new readings
                {newEntriesCount > 0 ? ` (${newEntriesCount})` : ""}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
