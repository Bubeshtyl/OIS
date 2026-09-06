"use client";

import Link from "next/link";
import { memo, useCallback, useMemo, useRef, useState, useTransition } from "react";
import type { MutableRefObject } from "react";
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

type DayPayload = {
  rsp: { hsd: string; ms: string; speed: string } | null;
  slips: Array<{
    machineNumber: string;
    nozzleNumber: number;
    reading: string;
  }>;
};

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
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [day, setDay] = useState<DayPayload>({
    rsp: initialRsp ?? null,
    slips: initialSlips ?? [],
  });
  const [isLoadingDate, startLoadingDate] = useTransition();
  const [rspEpoch, setRspEpoch] = useState(0);
  const [slipEpoch, setSlipEpoch] = useState(0);

  function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    startLoadingDate(async () => {
      const data = await fetchSixAmDataForDateAction(newDate);
      setDay({
        rsp: data.rsp
          ? {
              hsd: data.rsp.hsdPrice,
              ms: data.rsp.msPrice,
              speed: data.rsp.speedPrice,
            }
          : null,
        slips:
          data.slips?.map((s) => ({
            machineNumber: s.machineNumber,
            nozzleNumber: s.nozzleNumber,
            reading: s.reading,
          })) ?? [],
      });
      setRspEpoch((n) => n + 1);
      setSlipEpoch((n) => n + 1);
    });
  }

  function handleRspSaved(rsp: { hsd: string; ms: string; speed: string }) {
    setDay((prev) => ({ ...prev, rsp }));
    setRspEpoch((n) => n + 1);
  }

  function refreshSlips() {
    startLoadingDate(async () => {
      const data = await fetchSixAmDataForDateAction(selectedDate);
      setDay((prev) => ({
        ...prev,
        slips:
          data.slips?.map((s) => ({
            machineNumber: s.machineNumber,
            nozzleNumber: s.nozzleNumber,
            reading: s.reading,
          })) ?? [],
        rsp: data.rsp
          ? {
              hsd: data.rsp.hsdPrice,
              ms: data.rsp.msPrice,
              speed: data.rsp.speedPrice,
            }
          : prev.rsp,
      }));
      setSlipEpoch((n) => n + 1);
    });
  }

  return (
    <div className="space-y-6">
      <RspSection
        key={`${selectedDate}-${rspEpoch}-rsp`}
        selectedDate={selectedDate}
        today={initialDate}
        initialRsp={day.rsp}
        isLoadingDate={isLoadingDate}
        onDateChange={handleDateChange}
        onRspSaved={handleRspSaved}
      />
      <SlipSection
        key={`${selectedDate}-${slipEpoch}-slips`}
        selectedDate={selectedDate}
        initialSlips={day.slips}
        isLoadingDate={isLoadingDate}
        onSaved={refreshSlips}
      />
    </div>
  );
}

function RspSection({
  selectedDate,
  today,
  initialRsp,
  isLoadingDate,
  onDateChange,
  onRspSaved,
}: {
  selectedDate: string;
  today: string;
  initialRsp: { hsd: string; ms: string; speed: string } | null;
  isLoadingDate: boolean;
  onDateChange: (date: string) => void;
  onRspSaved: (rsp: { hsd: string; ms: string; speed: string }) => void;
}) {
  const hasRecordedRsp = Boolean(initialRsp);
  const pricesRef = useRef({
    ms: initialRsp?.ms || "",
    hsd: initialRsp?.hsd || "",
    speed: initialRsp?.speed || "",
  });
  const [priceResetKey, setPriceResetKey] = useState(0);
  const [isSavingRsp, startSavingRsp] = useTransition();
  const dateChange = useCallback(
    (date: string) => onDateChange(date),
    [onDateChange]
  );

  function handleRspSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasRecordedRsp) {
      toast.error(
        "RSP for this date is already recorded. Request edits from the RSP Ledger."
      );
      return;
    }
    const prices = pricesRef.current;
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
        toast.success(res.message || "RSP fuel prices saved successfully!");
        onRspSaved({
          hsd: prices.hsd,
          ms: prices.ms,
          speed: prices.speed,
        });
      } else {
        toast.error(res.error || "Failed to save RSP prices.");
      }
    });
  }

  function handleRspReset() {
    if (hasRecordedRsp) return;
    pricesRef.current = { ms: "", hsd: "", speed: "" };
    setPriceResetKey((n) => n + 1);
    toast.info("Reset fuel price inputs.");
  }

  return (
    <Card className="border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">RSP</CardTitle>
          {hasRecordedRsp ? (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
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
                "inline-flex h-auto items-center gap-1 p-0"
              )}
            >
              Request edits from RSP Ledger
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        ) : null}

        <form onSubmit={handleRspSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Date</Label>
              <DatePicker
                value={selectedDate}
                onChange={dateChange}
                today={today}
                className="h-10 text-xs font-medium"
              />
            </div>

            <RspPriceFields
              key={priceResetKey}
              initial={pricesRef.current}
              readOnly={hasRecordedRsp}
              pricesRef={pricesRef}
            />
          </div>

          {!hasRecordedRsp ? (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={isSavingRsp || isLoadingDate}
                className="h-9 w-full px-6 text-xs font-semibold sm:w-auto"
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
                className="h-9 w-full px-5 text-xs font-semibold sm:w-auto"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function RspPriceFields({
  initial,
  readOnly,
  pricesRef,
}: {
  initial: { hsd: string; ms: string; speed: string };
  readOnly: boolean;
  pricesRef: MutableRefObject<{ hsd: string; ms: string; speed: string }>;
}) {
  return (
    <>
      <PriceField
        id="price-hsd"
        label="HSD"
        badge="Diesel"
        badgeClassName="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
        defaultValue={initial.hsd}
        readOnly={readOnly}
        onChange={(hsd) => {
          pricesRef.current = { ...pricesRef.current, hsd };
        }}
      />
      <PriceField
        id="price-ms"
        label="MS"
        badge="Petrol"
        badgeClassName="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
        defaultValue={initial.ms}
        readOnly={readOnly}
        onChange={(ms) => {
          pricesRef.current = { ...pricesRef.current, ms };
        }}
      />
      <PriceField
        id="price-speed"
        label="SPEED"
        badge="Speed"
        badgeClassName="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
        defaultValue={initial.speed}
        readOnly={readOnly}
        onChange={(speed) => {
          pricesRef.current = { ...pricesRef.current, speed };
        }}
      />
    </>
  );
}

const PriceField = memo(function PriceField({
  id,
  label,
  badge,
  badgeClassName,
  defaultValue,
  readOnly,
  onChange,
}: {
  id: string;
  label: string;
  badge: string;
  badgeClassName: string;
  defaultValue: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  function handleChange(next: string) {
    setValue(next);
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-semibold text-foreground">
          {label}
        </Label>
        <Badge
          variant="outline"
          className={cn("px-1.5 py-0 text-[10px]", badgeClassName)}
        >
          {badge}
        </Badge>
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          ₹
        </span>
        <Input
          id={id}
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={readOnly}
          required
          className={cn(
            "h-10 pl-7 text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            readOnly && "bg-muted/50"
          )}
        />
      </div>
    </div>
  );
});
function SlipSection({
  selectedDate,
  initialSlips,
  isLoadingDate,
  onSaved,
}: {
  selectedDate: string;
  initialSlips: Array<{
    machineNumber: string;
    nozzleNumber: number;
    reading: string;
  }>;
  isLoadingDate: boolean;
  onSaved: () => void;
}) {
  const existingSlipKeys = useMemo(
    () => buildExistingSlipKeys(initialSlips),
    [initialSlips]
  );
  const initialReadings = useMemo(
    () => buildSlipReadingsMap(initialSlips),
    [initialSlips]
  );
  const readingsRef = useRef<Record<string, string>>({ ...initialReadings });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "group-1": true,
    "group-2": false,
    "group-3": false,
  });
  const [isSavingSlips, startSavingSlips] = useTransition();

  const hasRecordedSlips = existingSlipKeys.size > 0;

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

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
        const val = readingsRef.current[nozzle.id];
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
        onSaved();
      } else {
        toast.error(res.error || "Failed to save slip entries.");
      }
    });
  }

  return (
    <Card className="border shadow-xs">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">6 AM Slip Entry</CardTitle>
          {hasRecordedSlips ? (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {existingSlipKeys.size} recorded
            </Badge>
          ) : null}
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
                "inline-flex h-auto items-center gap-1 p-0"
              )}
            >
              Request edits from Ledger
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        ) : null}

        <form onSubmit={handleSlipSubmit} className="space-y-4">
          <div className="space-y-3">
            {SLIP_GROUPS.map((group) => (
              <SlipGroupCard
                key={group.id}
                group={group}
                isOpen={Boolean(openGroups[group.id])}
                onToggle={toggleGroup}
                initialReadings={initialReadings}
                existingSlipKeys={existingSlipKeys}
                readingsRef={readingsRef}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSavingSlips || isLoadingDate}
              className="h-9 w-full px-6 text-xs font-semibold sm:w-auto"
            >
              {isSavingSlips ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 size-3.5" />
              )}
              Save new readings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const SlipGroupCard = memo(function SlipGroupCard({
  group,
  isOpen,
  onToggle,
  initialReadings,
  existingSlipKeys,
  readingsRef,
}: {
  group: SlipEntryGroup;
  isOpen: boolean;
  onToggle: (id: string) => void;
  initialReadings: Record<string, string>;
  existingSlipKeys: Set<string>;
  readingsRef: MutableRefObject<Record<string, string>>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-2xs transition-all">
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors",
          isOpen
            ? "border-b bg-muted/50 text-foreground"
            : "text-foreground hover:bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="size-4 text-muted-foreground transition-transform" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground transition-transform" />
          )}
          <span className="text-sm font-semibold">{group.title}</span>
        </div>
      </button>

      {isOpen ? (
        <div className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {group.nozzles.map((nozzle) => {
              const key = slipKey(group.machineNumber, nozzle.nozzleNumber);
              const isLocked = existingSlipKeys.has(key);

              return (
                <SlipNozzleField
                  key={nozzle.id}
                  id={nozzle.id}
                  label={nozzle.label}
                  defaultValue={initialReadings[nozzle.id] ?? ""}
                  locked={isLocked}
                  readingsRef={readingsRef}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
});

const SlipNozzleField = memo(function SlipNozzleField({
  id,
  label,
  defaultValue,
  locked,
  readingsRef,
}: {
  id: string;
  label: string;
  defaultValue: string;
  locked: boolean;
  readingsRef: MutableRefObject<Record<string, string>>;
}) {
  const [value, setValue] = useState(defaultValue);

  function handleChange(next: string) {
    setValue(next);
    readingsRef.current[id] = next;
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
        {locked ? (
          <span className="ml-1 text-[10px] text-muted-foreground">
            (recorded)
          </span>
        ) : null}
      </Label>
      <Input
        id={id}
        type="number"
        step="any"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={locked}
        className={cn(
          "h-10 text-center text-sm font-medium tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          locked && "bg-muted/50"
        )}
      />
    </div>
  );
});
