"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

interface SlipEntryGroup {
  id: string;
  title: string;
  nozzles: Array<{ id: string; label: string }>;
}

const SLIP_GROUPS: SlipEntryGroup[] = [
  {
    id: "group-1",
    title: "202206000654",
    nozzles: [
      { id: "g1-n1", label: "Nozzle 1" },
      { id: "g1-n2", label: "Nozzle 2" },
      { id: "g1-n3", label: "Nozzle 3" },
      { id: "g1-n4", label: "Nozzle 4" },
    ],
  },
  {
    id: "group-2",
    title: "M2446157",
    nozzles: [
      { id: "g2-n1", label: "Nozzle 1" },
      { id: "g2-n2", label: "Nozzle 2" },
      { id: "g2-n3", label: "Nozzle 3" },
      { id: "g2-n4", label: "Nozzle 4" },
      { id: "g2-n5", label: "Nozzle 5" },
      { id: "g2-n6", label: "Nozzle 6" },
    ],
  },
  {
    id: "group-3",
    title: "202206000650",
    nozzles: [
      { id: "g3-n1", label: "Nozzle 1" },
      { id: "g3-n2", label: "Nozzle 2" },
      { id: "g3-n3", label: "Nozzle 3" },
      { id: "g3-n4", label: "Nozzle 4" },
    ],
  },
];

export function SixAmShiftClosingForm({
  initialDate,
}: {
  initialDate: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [prices, setPrices] = useState({
    ms: "",
    hsd: "",
    speed: "",
  });
  const [savedPrices, setSavedPrices] = useState(false);

  // Slip Entry state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "group-1": true,
    "group-2": false,
    "group-3": false,
  });

  const [slipReadings, setSlipReadings] = useState<Record<string, string>>({});

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

  function handleRspSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prices.ms || !prices.hsd || !prices.speed) {
      toast.error("Please enter daily prices for HSD, MS, and SPEED.");
      return;
    }
    setSavedPrices(true);
    toast.success("RSP fuel prices saved successfully!");
  }

  function handleRspReset() {
    setPrices({
      ms: "",
      hsd: "",
      speed: "",
    });
    setSelectedDate(initialDate);
    setSavedPrices(false);
    toast.info("Reset fuel prices and date.");
  }

  function handleSlipSubmit(e: React.FormEvent) {
    e.preventDefault();
    const enteredValues = Object.entries(slipReadings).filter(
      ([, val]) => val && val.trim() !== ""
    );

    if (enteredValues.length === 0) {
      toast.error("Please enter at least one slip reading before saving.");
      return;
    }

    toast.success(`Slip entries saved successfully (${enteredValues.length} readings).`);
  }

  function handleSlipReset() {
    setSlipReadings({});
    toast.info("Reset all slip entry readings.");
  }

  return (
    <div className="space-y-6">
      {/* 1. RSP Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">RSP</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <form onSubmit={handleRspSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Editable Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Date
                </Label>
                <DatePicker
                  value={selectedDate}
                  onChange={(d) => {
                    setSelectedDate(d);
                    setSavedPrices(false);
                  }}
                  today={initialDate}
                  className="h-10 text-xs font-medium"
                />
              </div>

              {/* 2. HSD (Diesel) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-hsd" className="text-xs font-semibold text-foreground">
                    HSD
                  </Label>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
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
                    onChange={(e) => {
                      setPrices((prev) => ({ ...prev, hsd: e.target.value }));
                      setSavedPrices(false);
                    }}
                    required
                    className="h-10 pl-7 text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 3. MS (Petrol) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-ms" className="text-xs font-semibold text-foreground">
                    MS
                  </Label>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
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
                    onChange={(e) => {
                      setPrices((prev) => ({ ...prev, ms: e.target.value }));
                      setSavedPrices(false);
                    }}
                    required
                    className="h-10 pl-7 text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 4. SPEED */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="price-speed" className="text-xs font-semibold text-foreground">
                    SPEED
                  </Label>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300">
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
                    onChange={(e) => {
                      setPrices((prev) => ({ ...prev, speed: e.target.value }));
                      setSavedPrices(false);
                    }}
                    required
                    className="h-10 pl-7 text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <Button type="submit" size="sm" className="h-9 w-full sm:w-auto px-6 text-xs font-semibold">
                <CheckCircle2 className="mr-1.5 size-3.5" />
                Save
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRspReset}
                className="h-9 w-full sm:w-auto px-5 text-xs font-semibold"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Slip Entry Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Slip Entry</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <form onSubmit={handleSlipSubmit} className="space-y-4">
            <div className="space-y-3">
              {SLIP_GROUPS.map((group) => {
                const isOpen = Boolean(openGroups[group.id]);

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border bg-card transition-all shadow-2xs overflow-hidden"
                  >
                    {/* Collapsible Dropdown Header Bar */}
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

                    {/* Nozzle Input Content */}
                    {isOpen && (
                      <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {group.nozzles.map((nozzle) => (
                            <div key={nozzle.id} className="space-y-1.5">
                              <Label
                                htmlFor={nozzle.id}
                                className="text-xs font-medium text-foreground"
                              >
                                {nozzle.label}
                              </Label>
                              <Input
                                id={nozzle.id}
                                type="number"
                                step="any"
                                value={slipReadings[nozzle.id] ?? ""}
                                onChange={(e) =>
                                  handleSlipInputChange(nozzle.id, e.target.value)
                                }
                                className="h-10 text-center text-sm font-medium tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              <Button
                type="submit"
                size="sm"
                className="h-9 w-full sm:w-auto px-6 text-xs font-semibold"
              >
                <CheckCircle2 className="mr-1.5 size-3.5" />
                Save
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSlipReset}
                className="h-9 w-full sm:w-auto px-5 text-xs font-semibold"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
