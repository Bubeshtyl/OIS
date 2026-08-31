"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Calculator,
  Coins,
  Lock,
  PlusCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PumpWithNozzles } from "@/lib/station-config/service";
import { cn } from "@/lib/utils";

export interface CashDenominations {
  d500: string;
  d200: string;
  d100: string;
  d50: string;
  d20: string;
  d10: string;
  coins: string;
}

export interface PumpPaymentBreakdown {
  cash: CashDenominations;
  pinelabsCard: string;
  pinelabsUpi: string;
  pinelabsAlp: string;
  pos: string;
  qr: string;
  ufill: string;
  bill: string;
  expenses: string;
}

const DEFAULT_DENOMINATIONS: CashDenominations = {
  d500: "",
  d200: "",
  d100: "",
  d50: "",
  d20: "",
  d10: "",
  coins: "",
};

const DEFAULT_PAYMENT: PumpPaymentBreakdown = {
  cash: { ...DEFAULT_DENOMINATIONS },
  pinelabsCard: "",
  pinelabsUpi: "",
  pinelabsAlp: "",
  pos: "",
  qr: "",
  ufill: "",
  bill: "",
  expenses: "",
};

export function calculateDenominationCash(d: CashDenominations): number {
  return (
    (Number(d.d500) || 0) * 500 +
    (Number(d.d200) || 0) * 200 +
    (Number(d.d100) || 0) * 100 +
    (Number(d.d50) || 0) * 50 +
    (Number(d.d20) || 0) * 20 +
    (Number(d.d10) || 0) * 10 +
    (Number(d.coins) || 0)
  );
}

export function calculatePumpTotalPayment(p: PumpPaymentBreakdown): number {
  const cash = calculateDenominationCash(p.cash);
  const pinelabsCard = Number(p.pinelabsCard) || 0;
  const pinelabsUpi = Number(p.pinelabsUpi) || 0;
  const pinelabsAlp = Number(p.pinelabsAlp) || 0;
  const pos = Number(p.pos) || 0;
  const qr = Number(p.qr) || 0;
  const ufill = Number(p.ufill) || 0;
  const bill = Number(p.bill) || 0;
  const expenses = Number(p.expenses) || 0;

  return (
    cash +
    pinelabsCard +
    pinelabsUpi +
    pinelabsAlp +
    pos +
    qr +
    ufill +
    bill +
    expenses
  );
}

interface NozzleReading {
  id: string;
  name: string;
  productName?: string | null;
  productCode?: string | null;
  productColor?: string | null;
  open: string;
  close: string;
  test: string;
}

interface PumpData {
  pumpNumber: number;
  name: string;
  nozzles: NozzleReading[];
  payment: PumpPaymentBreakdown;
}

interface CalculatedNozzle {
  id: string;
  name: string;
  productName?: string | null;
  productCode?: string | null;
  open: number;
  close: number;
  test: number;
  gross: number;
  netSale: number;
  error?: string;
}

interface PumpCalculationResult {
  pumpNumber: number;
  name: string;
  nozzleResults: CalculatedNozzle[];
  totalGross: number;
  totalTest: number;
  totalNetSale: number;
  hasErrors: boolean;
}

const DEFAULT_PUMP_LAYOUT: Record<number, { name: string; nozzles: Array<{ id: string; name: string }> }> = {
  1: { name: "Pump 1", nozzles: [{ id: "p1-n1", name: "Nozzle 1" }, { id: "p1-n2", name: "Nozzle 2" }] },
  2: { name: "Pump 2", nozzles: [{ id: "p2-n3", name: "Nozzle 3" }, { id: "p2-n4", name: "Nozzle 4" }] },
  3: { name: "Pump 3", nozzles: [{ id: "p3-n1", name: "Nozzle 1" }, { id: "p3-n3", name: "Nozzle 3" }, { id: "p3-n5", name: "Nozzle 5" }] },
  4: { name: "Pump 4", nozzles: [{ id: "p4-n2", name: "Nozzle 2" }, { id: "p4-n4", name: "Nozzle 4" }, { id: "p4-n6", name: "Nozzle 6" }] },
  5: { name: "Pump 5", nozzles: [{ id: "p5-n3", name: "Nozzle 3" }, { id: "p5-n4", name: "Nozzle 4" }] },
  6: { name: "Pump 6", nozzles: [{ id: "p6-n1", name: "Nozzle 1" }, { id: "p6-n2", name: "Nozzle 2" }] },
};

function buildInitialPumpsData(configuredPumps?: PumpWithNozzles[]): Record<number, PumpData> {
  const result: Record<number, PumpData> = {};

  if (configuredPumps && configuredPumps.length > 0) {
    for (const p of configuredPumps) {
      result[p.pumpNumber] = {
        pumpNumber: p.pumpNumber,
        name: p.name,
        nozzles:
          p.nozzles.length > 0
            ? p.nozzles.map((nz) => ({
                id: nz.id,
                name: nz.name,
                productName: nz.product?.name ?? null,
                productCode: nz.product?.code ?? null,
                productColor: nz.product?.color ?? null,
                open: "",
                close: "",
                test: "",
              }))
            : [
                {
                  id: `${p.id}-n1`,
                  name: "Nozzle 1",
                  open: "",
                  close: "",
                  test: "",
                },
                {
                  id: `${p.id}-n2`,
                  name: "Nozzle 2",
                  open: "",
                  close: "",
                  test: "",
                },
              ],
        payment: { ...DEFAULT_PAYMENT, cash: { ...DEFAULT_DENOMINATIONS } },
      };
    }
    return result;
  }

  // Fallback to default 1..6 diagram
  for (const [pNum, cfg] of Object.entries(DEFAULT_PUMP_LAYOUT)) {
    const num = Number(pNum);
    result[num] = {
      pumpNumber: num,
      name: cfg.name,
      nozzles: cfg.nozzles.map((n) => ({
        id: n.id,
        name: n.name,
        open: "",
        close: "",
        test: "",
      })),
      payment: { ...DEFAULT_PAYMENT, cash: { ...DEFAULT_DENOMINATIONS } },
    };
  }
  return result;
}

export function ShiftClosingCalculator({
  configuredPumps,
}: {
  configuredPumps?: PumpWithNozzles[];
}) {
  const initialData = useMemo(
    () => buildInitialPumpsData(configuredPumps),
    [configuredPumps]
  );

  const pumpOptions = useMemo(() => {
    const keys = Object.keys(initialData).map(Number).sort((a, b) => a - b);
    return keys.length > 0 ? keys : [1, 2, 3, 4, 5, 6];
  }, [initialData]);

  const [selectedPump, setSelectedPump] = useState<number>(() => pumpOptions[0] ?? 1);
  const [pumpsData, setPumpsData] = useState<Record<number, PumpData>>(initialData);
  const [showCollection, setShowCollection] = useState<boolean>(false);
  const [calculatedResults, setCalculatedResults] = useState<
    Record<number, PumpCalculationResult> | null
  >(null);

  const currentPumpData = pumpsData[selectedPump] || initialData[selectedPump] || {
    pumpNumber: selectedPump,
    name: `Pump ${selectedPump}`,
    nozzles: [
      {
        id: "n1",
        name: "Nozzle 1",
        open: "",
        close: "",
        test: "",
      },
      {
        id: "n2",
        name: "Nozzle 2",
        open: "",
        close: "",
        test: "",
      },
    ],
    payment: { ...DEFAULT_PAYMENT, cash: { ...DEFAULT_DENOMINATIONS } },
  };

  function updateNozzleField(
    nozzleId: string,
    field: "open" | "close" | "test",
    value: string
  ) {
    setPumpsData((prev) => {
      const currentPump = prev[selectedPump] || currentPumpData;
      const updatedNozzles = currentPump.nozzles.map((nozzle) => {
        if (nozzle.id === nozzleId) {
          return { ...nozzle, [field]: value };
        }
        return nozzle;
      });
      return {
        ...prev,
        [selectedPump]: {
          ...currentPump,
          nozzles: updatedNozzles,
        },
      };
    });
  }

  function updatePaymentField(
    field: keyof Omit<PumpPaymentBreakdown, "cash">,
    value: string
  ) {
    setPumpsData((prev) => {
      const currentPump = prev[selectedPump] || currentPumpData;
      return {
        ...prev,
        [selectedPump]: {
          ...currentPump,
          payment: {
            ...currentPump.payment,
            [field]: value,
          },
        },
      };
    });
  }

  function updateDenominationField(
    key: keyof CashDenominations,
    value: string
  ) {
    setPumpsData((prev) => {
      const currentPump = prev[selectedPump] || currentPumpData;
      return {
        ...prev,
        [selectedPump]: {
          ...currentPump,
          payment: {
            ...currentPump.payment,
            cash: {
              ...currentPump.payment.cash,
              [key]: value,
            },
          },
        },
      };
    });
  }

  function handleCalculate() {
    const results: Record<number, PumpCalculationResult> = {
      ...(calculatedResults || {}),
    };

    let hasAnyInput = false;

    const nozzleResults: CalculatedNozzle[] = [];
    let pumpGross = 0;
    let pumpTest = 0;
    let pumpNetSale = 0;
    let pumpHasErrors = false;

    for (const nozzle of currentPumpData.nozzles) {
      const openVal = nozzle.open.trim() === "" ? 0 : Number(nozzle.open);
      const closeVal = nozzle.close.trim() === "" ? 0 : Number(nozzle.close);
      const testVal = nozzle.test.trim() === "" ? 0 : Number(nozzle.test);

      if (
        nozzle.open.trim() !== "" ||
        nozzle.close.trim() !== "" ||
        nozzle.test.trim() !== ""
      ) {
        hasAnyInput = true;
      }

      let error: string | undefined;
      if (isNaN(openVal) || isNaN(closeVal) || isNaN(testVal)) {
        error = "Invalid number format";
        pumpHasErrors = true;
      } else if (closeVal < openVal && (nozzle.open || nozzle.close)) {
        error = "Closing reading cannot be less than opening reading";
        pumpHasErrors = true;
      } else if (testVal < 0) {
        error = "Testing volume cannot be negative";
        pumpHasErrors = true;
      }

      const gross = Math.max(0, closeVal - openVal);
      const netSale = Math.max(0, gross - testVal);

      if (testVal > gross && gross > 0) {
        error = "Testing exceeds gross sales volume";
        pumpHasErrors = true;
      }

      nozzleResults.push({
        id: nozzle.id,
        name: nozzle.name,
        productName: nozzle.productName,
        productCode: nozzle.productCode,
        open: openVal,
        close: closeVal,
        test: testVal,
        gross: isNaN(gross) ? 0 : gross,
        netSale: isNaN(netSale) ? 0 : netSale,
        error,
      });

      if (!error) {
        pumpGross += gross;
        pumpTest += testVal;
        pumpNetSale += netSale;
      }
    }

    if (!hasAnyInput) {
      toast.error("Please enter opening and closing readings to calculate.");
      return;
    }

    results[selectedPump] = {
      pumpNumber: selectedPump,
      name: currentPumpData.name,
      nozzleResults,
      totalGross: Number(pumpGross.toFixed(3)),
      totalTest: Number(pumpTest.toFixed(3)),
      totalNetSale: Number(pumpNetSale.toFixed(3)),
      hasErrors: pumpHasErrors,
    };

    setCalculatedResults(results);

    if (pumpHasErrors) {
      toast.warning(`Calculation completed for ${currentPumpData.name} with warnings.`);
    } else {
      toast.success(
        `${currentPumpData.name} calculated: ${pumpNetSale.toFixed(2)} Litres net sales.`
      );
    }
  }

  function handleReset() {
    setPumpsData((prev) => {
      const currentPump = prev[selectedPump] || currentPumpData;
      const resetNozzles = currentPump.nozzles.map((nozzle) => ({
        ...nozzle,
        open: "",
        close: "",
        test: "",
      }));
      return {
        ...prev,
        [selectedPump]: {
          ...currentPump,
          nozzles: resetNozzles,
        },
      };
    });

    setCalculatedResults((prev) => {
      if (!prev) return null;
      const copy = { ...prev };
      delete copy[selectedPump];
      return Object.keys(copy).length > 0 ? copy : null;
    });

    toast.info(`Reset meter readings for ${currentPumpData.name}.`);
  }

  function handleResetCollections() {
    setPumpsData((prev) => {
      const currentPump = prev[selectedPump] || currentPumpData;
      return {
        ...prev,
        [selectedPump]: {
          ...currentPump,
          payment: { ...DEFAULT_PAYMENT, cash: { ...DEFAULT_DENOMINATIONS } },
        },
      };
    });
    toast.info(`Reset collections for ${currentPumpData.name}.`);
  }

  const currentCalculation = calculatedResults?.[selectedPump];

  const hasAnyNozzleInput = useMemo(() => {
    return currentPumpData.nozzles.some(
      (n) => n.open.trim() !== "" || n.close.trim() !== "" || n.test.trim() !== ""
    );
  }, [currentPumpData.nozzles]);

  // Totals for current pump payments
  const pumpCash = calculateDenominationCash(currentPumpData.payment.cash);
  const pumpTotalPayment = calculatePumpTotalPayment(currentPumpData.payment);

  return (
    <div className="space-y-6">
      {/* Meter Readings Card */}
      <Card className="border shadow-sm">
        <CardContent className="space-y-6 pt-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="pump-select" className="text-sm font-medium text-foreground">
              Pump
            </Label>
            <Select
              value={String(selectedPump)}
              onValueChange={(val) => val && setSelectedPump(Number(val))}
            >
              <SelectTrigger id="pump-select" className="h-11 w-full bg-background text-base font-medium">
                <SelectValue placeholder="Select Pump" />
              </SelectTrigger>
              <SelectContent>
                {pumpOptions.map((num) => {
                  const pName = pumpsData[num]?.name || `Pump ${num}`;
                  return (
                    <SelectItem key={num} value={String(num)} className="text-sm">
                      {pName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border bg-card p-2 sm:p-3 shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[580px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[90px] sm:w-[100px] px-1 text-center font-semibold text-xs py-2 tracking-wider uppercase text-muted-foreground">NOZZLE</TableHead>
                    <TableHead className="min-w-[150px] text-center font-semibold text-xs py-2 tracking-wider uppercase text-muted-foreground">OPEN</TableHead>
                    <TableHead className="min-w-[150px] text-center font-semibold text-xs py-2 tracking-wider uppercase text-muted-foreground">CLOSE</TableHead>
                    <TableHead className="min-w-[150px] text-center font-semibold text-xs py-2 tracking-wider uppercase text-muted-foreground">TEST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPumpData.nozzles.map((nozzle) => {
                    const nozzleCalc = currentCalculation?.nozzleResults.find(
                      (n) => n.id === nozzle.id
                    );

                    return (
                      <TableRow key={nozzle.id} className="hover:bg-muted/20">
                        <TableCell className="w-[90px] sm:w-[100px] px-1 py-1.5 font-medium text-xs sm:text-sm text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="size-1.5 rounded-full bg-primary/60" />
                            <span>{nozzle.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            step="any"
                            value={nozzle.open}
                            onChange={(e) =>
                              updateNozzleField(nozzle.id, "open", e.target.value)
                            }
                            className="h-10 w-full min-w-[160px] text-center text-sm font-medium px-3 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            step="any"
                            value={nozzle.close}
                            onChange={(e) =>
                              updateNozzleField(nozzle.id, "close", e.target.value)
                            }
                            className={cn(
                              "h-10 w-full min-w-[160px] text-center text-sm font-medium px-3 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                              nozzleCalc?.error && "border-destructive focus-visible:ring-destructive"
                            )}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            step="any"
                            value={nozzle.test}
                            onChange={(e) =>
                              updateNozzleField(nozzle.id, "test", e.target.value)
                            }
                            className="h-10 w-full min-w-[160px] text-center text-sm font-medium px-3 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <Button
                type="button"
                onClick={handleCalculate}
                className="h-10 w-full text-sm font-semibold shadow-xs"
              >
                <Calculator className="mr-2 size-4" />
                Calculate
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-10 w-full text-sm font-semibold"
              >
                <RotateCcw className="mr-2 size-4" />
                Reset
              </Button>

              <Button
                type="button"
                variant={showCollection ? "default" : "outline"}
                disabled={!hasAnyNozzleInput}
                onClick={() => setShowCollection((prev) => !prev)}
                className={cn(
                  "h-10 w-full text-sm font-semibold transition-all",
                  showCollection && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                <PlusCircle className="mr-2 size-4" />
                {showCollection ? "Hide Collections" : "Add Collections"}
              </Button>
            </div>

            {currentCalculation && (
              <div className="flex justify-center pt-1">
                <div className="flex w-fit items-center gap-3 rounded-xl border-2 border-red-500/40 bg-red-50/60 px-6 py-3.5 shadow-xs dark:border-red-900/60 dark:bg-red-950/30">
                  <span className="text-xl font-bold tracking-tight text-red-600 dark:text-red-400">
                    Total Sales
                  </span>
                  <span className="text-xl font-bold text-red-500 dark:text-red-400">-</span>
                  <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400 tabular-nums">
                    0
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Amount Collected Card (Shown only when 'Add Collections' is clicked) */}
      {showCollection && (
        <Card className="border shadow-sm">
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Cash - Denomination */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Cash - Denomination (₹)
                </Label>
                <Dialog>
                  <DialogTrigger
                    type="button"
                    className="group flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background/80 px-3 py-2 text-xs font-semibold shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground">
                      <Banknote className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Denominations</span>
                    </span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      ₹ {pumpCash.toLocaleString("en-IN")}
                    </span>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                        <Banknote className="size-4 text-emerald-600" />
                        Cash Denominations — {currentPumpData.name}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-2.5 py-2">
                      <div className="grid grid-cols-1 gap-2">
                        <DenominationRow
                          multiplier={500}
                          value={currentPumpData.payment.cash.d500}
                          onChange={(v) => updateDenominationField("d500", v)}
                        />
                        <DenominationRow
                          multiplier={200}
                          value={currentPumpData.payment.cash.d200}
                          onChange={(v) => updateDenominationField("d200", v)}
                        />
                        <DenominationRow
                          multiplier={100}
                          value={currentPumpData.payment.cash.d100}
                          onChange={(v) => updateDenominationField("d100", v)}
                        />
                        <DenominationRow
                          multiplier={50}
                          value={currentPumpData.payment.cash.d50}
                          onChange={(v) => updateDenominationField("d50", v)}
                        />
                        <DenominationRow
                          multiplier={20}
                          value={currentPumpData.payment.cash.d20}
                          onChange={(v) => updateDenominationField("d20", v)}
                        />
                        <DenominationRow
                          multiplier={10}
                          value={currentPumpData.payment.cash.d10}
                          onChange={(v) => updateDenominationField("d10", v)}
                        />
                        {/* Coins */}
                        <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-2 text-xs">
                          <div className="flex items-center gap-2 min-w-[120px] font-semibold text-foreground">
                            <Coins className="size-3.5 text-amber-600" />
                            <span>Coins (₹)</span>
                          </div>
                          <div className="flex-1 max-w-[120px]">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={currentPumpData.payment.cash.coins}
                              onChange={(e) =>
                                updateDenominationField("coins", e.target.value)
                              }
                              className="h-8 text-center text-xs font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <span className="w-20 text-right font-bold text-foreground tabular-nums">
                            ₹ {(Number(currentPumpData.payment.cash.coins) || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-lg border bg-emerald-50/70 p-2.5 dark:bg-emerald-950/30">
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          Total Cash for {currentPumpData.name}
                        </span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          ₹ {pumpCash.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="pt-2">
                        <DialogClose render={<Button type="button" className="h-10 w-full text-sm font-semibold shadow-xs">Save</Button>} />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* 2. Pinelabs Card */}
              <div className="space-y-2">
                <Label htmlFor="pump-pinelabs-card" className="text-sm font-semibold text-foreground">
                  Pinelabs Card (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-pinelabs-card"
                    type="number"
                    step="any"
                    min="0"
                    value={currentPumpData.payment.pinelabsCard}
                    onChange={(e) => updatePaymentField("pinelabsCard", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 3. Pinelabs UPI */}
              <div className="space-y-2">
                <Label htmlFor="pump-pinelabs-upi" className="text-sm font-semibold text-foreground">
                  Pinelabs UPI (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-pinelabs-upi"
                    type="number"
                    step="any"
                    min="0"
                    value={currentPumpData.payment.pinelabsUpi}
                    onChange={(e) => updatePaymentField("pinelabsUpi", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 4. Pinelabs ALP */}
              <div className="space-y-2">
                <Label htmlFor="pump-pinelabs-alp" className="text-sm font-semibold text-foreground">
                  Pinelabs ALP (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-pinelabs-alp"
                    type="number"
                    step="any"
                    min="0"
                    value={currentPumpData.payment.pinelabsAlp}
                    onChange={(e) => updatePaymentField("pinelabsAlp", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 5. POS */}
              <div className="space-y-2">
                <Label htmlFor="pump-pos" className="text-sm font-semibold text-foreground">
                  POS (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-pos"
                    type="number"
                    step="any"
                    min="0"
                    value={currentPumpData.payment.pos}
                    onChange={(e) => updatePaymentField("pos", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 6. QR */}
              <div className="space-y-2">
                <Label htmlFor="pump-qr" className="text-sm font-semibold text-foreground">
                  QR (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-qr"
                    type="number"
                    step="any"
                    min="0"
                    value={currentPumpData.payment.qr}
                    onChange={(e) => updatePaymentField("qr", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 7. UFILL */}
              <div className="space-y-2">
                <Label htmlFor="pump-ufill" className="text-sm font-semibold text-foreground">
                  UFILL (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-ufill"
                    type="number"
                    step="any"
                    min="0"
                    value={currentPumpData.payment.ufill}
                    onChange={(e) => updatePaymentField("ufill", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 8. Bill */}
              <div className="space-y-2">
                <Label htmlFor="pump-bill" className="text-sm font-semibold text-foreground">
                  Bill (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-bill"
                    type="number"
                    step="any"
                    min="0"
                    value={currentPumpData.payment.bill}
                    onChange={(e) => updatePaymentField("bill", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 9. Expenses */}
              <div className="space-y-2">
                <Label htmlFor="pump-expenses" className="text-sm font-semibold text-foreground">
                  Expenses (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-expenses"
                    type="number"
                    step="any"
                    min="0"
                    value={currentPumpData.payment.expenses}
                    onChange={(e) => updatePaymentField("expenses", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* Total Collected Pill & Reset Collections */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex w-fit items-center gap-2.5 rounded-lg border-2 border-emerald-500/40 bg-emerald-50/60 px-4 py-2 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <span className="text-xs font-bold uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
                  Total Collected
                </span>
                <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">-</span>
                <span className="text-base font-bold tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
                  ₹ {pumpTotalPayment.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetCollections}
                className="h-9 px-4 text-xs font-semibold"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset Collections
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Summary Card (Shown when collections are enabled) */}
      {showCollection &&
        (() => {
          const totalSales = 0;
          const difference = pumpTotalPayment - totalSales;

          return (
            <Card className="border shadow-xs">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Total Sales */}
                  <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Sales
                    </span>
                    <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                      ₹ {totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Total Collected */}
                  <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Collected
                    </span>
                    <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                      ₹ {pumpTotalPayment.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Difference */}
                  <div
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border p-3.5 transition-colors",
                      difference === 0
                        ? "bg-muted/30 border-border text-foreground"
                        : difference < 0
                        ? "border-red-500/40 bg-red-50/60 dark:bg-red-950/30 dark:border-red-900/60"
                        : "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-900/60"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        difference === 0
                          ? "text-muted-foreground"
                          : difference < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      Difference
                    </span>
                    <span
                      className={cn(
                        "text-xl font-bold tracking-tight tabular-nums",
                        difference === 0
                          ? "text-foreground"
                          : difference < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {difference === 0
                        ? "0"
                        : difference < 0
                        ? `- ₹ ${Math.abs(difference).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `+ ₹ ${difference.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {/* Close Shift Action */}
      <div className="pt-2">
        <Button
          type="button"
          onClick={() => {
            toast.success(`Shift for ${currentPumpData.name} closed successfully!`);
          }}
          className="h-10 w-full text-sm font-semibold shadow-xs gap-2"
        >
          <Lock className="size-4" />
          Close Shift
        </Button>
      </div>
    </div>
  );
}

function DenominationRow({
  multiplier,
  value,
  onChange,
}: {
  multiplier: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const count = Number(value) || 0;
  const total = count * multiplier;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-2 text-xs">
      <div className="flex items-center gap-2 min-w-[100px] font-semibold text-foreground">
        <span className="font-bold text-emerald-700 dark:text-emerald-400">₹{multiplier}</span>
        <span className="text-muted-foreground">×</span>
      </div>
      <div className="flex-1 max-w-[120px]">
        <Input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-center text-xs font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <span className="w-20 text-right font-bold text-foreground tabular-nums">
        ₹ {total.toLocaleString("en-IN")}
      </span>
    </div>
  );
}
