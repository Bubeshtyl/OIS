"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Calculator,
  Coins,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
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

export interface NozzlePaymentBreakdown {
  cash: CashDenominations;
  upi: string;
  card: string;
  credit: string;
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

export function calculateNozzleTotalPayment(p: NozzlePaymentBreakdown): number {
  const cash = calculateDenominationCash(p.cash);
  const upi = Number(p.upi) || 0;
  const card = Number(p.card) || 0;
  const credit = Number(p.credit) || 0;
  return cash + upi + card + credit;
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
  payment: NozzlePaymentBreakdown;
}

interface PumpData {
  pumpNumber: number;
  name: string;
  nozzles: NozzleReading[];
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
                payment: {
                  cash: { ...DEFAULT_DENOMINATIONS },
                  upi: "",
                  card: "",
                  credit: "",
                },
              }))
            : [
                {
                  id: `${p.id}-n1`,
                  name: "Nozzle 1",
                  open: "",
                  close: "",
                  test: "",
                  payment: {
                    cash: { ...DEFAULT_DENOMINATIONS },
                    upi: "",
                    card: "",
                    credit: "",
                  },
                },
                {
                  id: `${p.id}-n2`,
                  name: "Nozzle 2",
                  open: "",
                  close: "",
                  test: "",
                  payment: {
                    cash: { ...DEFAULT_DENOMINATIONS },
                    upi: "",
                    card: "",
                    credit: "",
                  },
                },
              ],
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
        payment: {
          cash: { ...DEFAULT_DENOMINATIONS },
          upi: "",
          card: "",
          credit: "",
        },
      })),
    };
  }
  return result;
}

export function InterimCalculator({
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
        payment: { cash: { ...DEFAULT_DENOMINATIONS }, upi: "", card: "", credit: "" },
      },
      {
        id: "n2",
        name: "Nozzle 2",
        open: "",
        close: "",
        test: "",
        payment: { cash: { ...DEFAULT_DENOMINATIONS }, upi: "", card: "", credit: "" },
      },
    ],
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
    nozzleId: string,
    field: "upi" | "card" | "credit",
    value: string
  ) {
    setPumpsData((prev) => {
      const currentPump = prev[selectedPump] || currentPumpData;
      const updatedNozzles = currentPump.nozzles.map((nozzle) => {
        if (nozzle.id === nozzleId) {
          return {
            ...nozzle,
            payment: {
              ...nozzle.payment,
              [field]: value,
            },
          };
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

  function updateDenominationField(
    nozzleId: string,
    key: keyof CashDenominations,
    value: string
  ) {
    setPumpsData((prev) => {
      const currentPump = prev[selectedPump] || currentPumpData;
      const updatedNozzles = currentPump.nozzles.map((nozzle) => {
        if (nozzle.id === nozzleId) {
          return {
            ...nozzle,
            payment: {
              ...nozzle.payment,
              cash: {
                ...nozzle.payment.cash,
                [key]: value,
              },
            },
          };
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

  const currentCalculation = calculatedResults?.[selectedPump];

  // Totals for current pump payments
  const paymentTotals = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let card = 0;
    let credit = 0;

    for (const nz of currentPumpData.nozzles) {
      cash += calculateDenominationCash(nz.payment.cash);
      upi += Number(nz.payment.upi) || 0;
      card += Number(nz.payment.card) || 0;
      credit += Number(nz.payment.credit) || 0;
    }

    return {
      cash,
      upi,
      card,
      credit,
      total: cash + upi + card + credit,
    };
  }, [currentPumpData.nozzles]);

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

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[180px] text-center font-semibold text-base py-3.5 tracking-wider uppercase">NOZZLE</TableHead>
                    <TableHead className="min-w-[220px] text-center font-semibold text-base py-3.5 tracking-wider uppercase">OPEN</TableHead>
                    <TableHead className="min-w-[220px] text-center font-semibold text-base py-3.5 tracking-wider uppercase">CLOSE</TableHead>
                    <TableHead className="min-w-[220px] text-center font-semibold text-base py-3.5 tracking-wider uppercase">TEST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPumpData.nozzles.map((nozzle) => {
                    const nozzleCalc = currentCalculation?.nozzleResults.find(
                      (n) => n.id === nozzle.id
                    );

                    return (
                      <TableRow key={nozzle.id} className="hover:bg-muted/20">
                        <TableCell className="font-semibold text-base py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="size-2.5 rounded-full bg-primary/60" />
                            <span>{nozzle.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Input
                            type="number"
                            step="any"
                            value={nozzle.open}
                            onChange={(e) =>
                              updateNozzleField(nozzle.id, "open", e.target.value)
                            }
                            className="h-12 w-full min-w-[200px] text-center text-lg font-medium px-4 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <Input
                            type="number"
                            step="any"
                            value={nozzle.close}
                            onChange={(e) =>
                              updateNozzleField(nozzle.id, "close", e.target.value)
                            }
                            className={cn(
                              "h-12 w-full min-w-[200px] text-center text-lg font-medium px-4 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                              nozzleCalc?.error && "border-destructive focus-visible:ring-destructive"
                            )}
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <Input
                            type="number"
                            step="any"
                            value={nozzle.test}
                            onChange={(e) =>
                              updateNozzleField(nozzle.id, "test", e.target.value)
                            }
                            className="h-12 w-full min-w-[200px] text-center text-lg font-medium px-4 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            <Button
              type="button"
              size="lg"
              onClick={handleCalculate}
              className="h-12 w-full sm:w-auto px-8 text-base font-semibold shadow-md"
            >
              <Calculator className="mr-2 size-5" />
              Calculate
            </Button>

            {currentCalculation && (
              <div className="flex w-fit items-center gap-3 rounded-xl border-2 border-red-500/40 bg-red-50/60 px-6 py-3.5 shadow-xs dark:border-red-900/60 dark:bg-red-950/30">
                <span className="text-xl font-bold tracking-tight text-red-600 dark:text-red-400">
                  Total Sales
                </span>
                <span className="text-xl font-bold text-red-500 dark:text-red-400">-</span>
                <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400 tabular-nums">
                  0
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Amount Collected Card with Multiple Payment Methods & Denominations */}
      <Card className="border shadow-xs">
        <CardContent className="space-y-4 pt-4">
          <div className="rounded-lg border bg-card p-3 shadow-2xs">
            <div className="overflow-x-auto">
              <Table className="min-w-[780px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[120px] text-center font-semibold text-xs py-2 tracking-wider uppercase">
                      NOZZLE
                    </TableHead>
                    <TableHead className="min-w-[180px] text-center font-semibold text-xs py-2 tracking-wider uppercase">
                      CASH (₹)
                    </TableHead>
                    <TableHead className="min-w-[140px] text-center font-semibold text-xs py-2 tracking-wider uppercase">
                      UPI / DIGITAL (₹)
                    </TableHead>
                    <TableHead className="min-w-[140px] text-center font-semibold text-xs py-2 tracking-wider uppercase">
                      CARD / POS (₹)
                    </TableHead>
                    <TableHead className="min-w-[140px] text-center font-semibold text-xs py-2 tracking-wider uppercase">
                      CREDIT (₹)
                    </TableHead>
                    <TableHead className="w-[120px] text-center font-semibold text-xs py-2 tracking-wider uppercase">
                      TOTAL (₹)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPumpData.nozzles.map((nozzle) => {
                    const cashVal = calculateDenominationCash(nozzle.payment.cash);
                    const nozzleTotal = calculateNozzleTotalPayment(nozzle.payment);

                    return (
                      <TableRow key={nozzle.id} className="hover:bg-muted/20">
                        {/* Nozzle Label */}
                        <TableCell className="font-semibold text-xs py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="size-2 rounded-full bg-primary/60" />
                            <span>{nozzle.name}</span>
                          </div>
                        </TableCell>

                        {/* Cash & Denomination Dialog Trigger */}
                        <TableCell className="py-2.5 text-center">
                          <Dialog>
                            <DialogTrigger
                              className="group inline-flex h-9 w-full min-w-[170px] items-center justify-between rounded-md border border-input bg-background/80 px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              <span className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground">
                                <Banknote className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Denominations</span>
                              </span>
                              <span className="font-bold text-foreground tabular-nums">
                                ₹ {cashVal.toLocaleString("en-IN")}
                              </span>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                                  <Banknote className="size-4 text-emerald-600" />
                                  Cash Denominations — {currentPumpData.name} ({nozzle.name})
                                </DialogTitle>
                              </DialogHeader>

                              <div className="space-y-2.5 py-2">
                                <div className="grid grid-cols-1 gap-2">
                                  {/* 500 */}
                                  <DenominationRow
                                    multiplier={500}
                                    value={nozzle.payment.cash.d500}
                                    onChange={(v) => updateDenominationField(nozzle.id, "d500", v)}
                                  />
                                  {/* 200 */}
                                  <DenominationRow
                                    multiplier={200}
                                    value={nozzle.payment.cash.d200}
                                    onChange={(v) => updateDenominationField(nozzle.id, "d200", v)}
                                  />
                                  {/* 100 */}
                                  <DenominationRow
                                    multiplier={100}
                                    value={nozzle.payment.cash.d100}
                                    onChange={(v) => updateDenominationField(nozzle.id, "d100", v)}
                                  />
                                  {/* 50 */}
                                  <DenominationRow
                                    multiplier={50}
                                    value={nozzle.payment.cash.d50}
                                    onChange={(v) => updateDenominationField(nozzle.id, "d50", v)}
                                  />
                                  {/* 20 */}
                                  <DenominationRow
                                    multiplier={20}
                                    value={nozzle.payment.cash.d20}
                                    onChange={(v) => updateDenominationField(nozzle.id, "d20", v)}
                                  />
                                  {/* 10 */}
                                  <DenominationRow
                                    multiplier={10}
                                    value={nozzle.payment.cash.d10}
                                    onChange={(v) => updateDenominationField(nozzle.id, "d10", v)}
                                  />
                                  {/* Coins */}
                                  <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-2 text-xs">
                                    <div className="flex items-center gap-2 min-w-[120px] font-semibold text-foreground">
                                      <Coins className="size-3.5 text-amber-600" />
                                      <span>Coins / Loose (₹)</span>
                                    </div>
                                    <div className="flex-1 max-w-[120px]">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={nozzle.payment.cash.coins}
                                        onChange={(e) =>
                                          updateDenominationField(nozzle.id, "coins", e.target.value)
                                        }
                                        className="h-8 text-center text-xs font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </div>
                                    <span className="w-20 text-right font-bold text-foreground tabular-nums">
                                      ₹ {(Number(nozzle.payment.cash.coins) || 0).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                </div>

                                {/* Total Cash Pill in Modal */}
                                <div className="mt-4 flex items-center justify-between rounded-lg border bg-emerald-50/70 p-2.5 dark:bg-emerald-950/30">
                                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                    Total Cash for {nozzle.name}
                                  </span>
                                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                    ₹ {cashVal.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>

                        {/* UPI / Digital */}
                        <TableCell className="py-2.5">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">
                              ₹
                            </span>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={nozzle.payment.upi}
                              onChange={(e) => updatePaymentField(nozzle.id, "upi", e.target.value)}
                              className="h-9 w-full text-center text-xs sm:text-sm font-medium px-2 pl-6 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </TableCell>

                        {/* Card / POS */}
                        <TableCell className="py-2.5">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">
                              ₹
                            </span>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={nozzle.payment.card}
                              onChange={(e) => updatePaymentField(nozzle.id, "card", e.target.value)}
                              className="h-9 w-full text-center text-xs sm:text-sm font-medium px-2 pl-6 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </TableCell>

                        {/* Credit */}
                        <TableCell className="py-2.5">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">
                              ₹
                            </span>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={nozzle.payment.credit}
                              onChange={(e) => updatePaymentField(nozzle.id, "credit", e.target.value)}
                              className="h-9 w-full text-center text-xs sm:text-sm font-medium px-2 pl-6 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </TableCell>

                        {/* Total For Nozzle */}
                        <TableCell className="py-2.5 text-center font-bold text-xs sm:text-sm text-foreground tabular-nums">
                          ₹ {nozzleTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Total Summary */}
          <div className="pt-1">
            <div className="flex w-fit items-center gap-2.5 rounded-lg border-2 border-emerald-500/40 bg-emerald-50/60 px-4 py-2 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <span className="text-xs font-bold uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
                Total Collected
              </span>
              <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">-</span>
              <span className="text-base font-bold tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
                ₹ {paymentTotals.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Summary Card */}
      {(() => {
        const totalSales = 0;
        const difference = paymentTotals.total - totalSales;

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
                    ₹ {paymentTotals.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          size="lg"
          onClick={() => {
            toast.success(`Shift for ${currentPumpData.name} closed successfully!`);
          }}
          className="h-12 w-full text-base font-semibold shadow-md gap-2"
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
