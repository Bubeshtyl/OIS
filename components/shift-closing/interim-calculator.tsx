"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Calculator,
  Coins,
  Loader2,
  Lock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
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
import type { SixAmStatus } from "@/lib/shift-closing/service";
import { closeInterimShiftAction } from "@/lib/actions/shift-closing";
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

interface NozzleReadingState {
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
  pumpId?: string;
  pumpNumber: number;
  name: string;
  nozzles: NozzleReadingState[];
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
  ratePerLitre?: number;
  salesAmount?: number;
  error?: string;
}

interface PumpCalculationResult {
  pumpNumber: number;
  name: string;
  nozzleResults: CalculatedNozzle[];
  totalGross: number;
  totalTest: number;
  totalNetSale: number;
  totalSalesAmount: number;
  hasErrors: boolean;
}

const DEFAULT_PUMP_LAYOUT: Record<
  number,
  {
    name: string;
    nozzles: Array<{
      id: string;
      name: string;
      productCode: string;
      productName: string;
    }>;
  }
> = {
  1: {
    name: "Pump 1",
    nozzles: [
      { id: "p1-n1", name: "Nozzle 1", productCode: "MS", productName: "Petrol (MS)" },
      { id: "p1-n2", name: "Nozzle 2", productCode: "HSD", productName: "Diesel (HSD)" },
    ],
  },
  2: {
    name: "Pump 2",
    nozzles: [
      { id: "p2-n3", name: "Nozzle 3", productCode: "MS", productName: "Petrol (MS)" },
      { id: "p2-n4", name: "Nozzle 4", productCode: "HSD", productName: "Diesel (HSD)" },
    ],
  },
  3: {
    name: "Pump 3",
    nozzles: [
      { id: "p3-n1", name: "Nozzle 1", productCode: "HSD", productName: "Diesel (HSD)" },
      { id: "p3-n3", name: "Nozzle 3", productCode: "SPEED", productName: "Speed" },
      { id: "p3-n5", name: "Nozzle 5", productCode: "MS", productName: "Petrol (MS)" },
    ],
  },
  4: {
    name: "Pump 4",
    nozzles: [
      { id: "p4-n2", name: "Nozzle 2", productCode: "HSD", productName: "Diesel (HSD)" },
      { id: "p4-n4", name: "Nozzle 4", productCode: "SPEED", productName: "Speed" },
      { id: "p4-n6", name: "Nozzle 6", productCode: "MS", productName: "Petrol (MS)" },
    ],
  },
  5: {
    name: "Pump 5",
    nozzles: [
      { id: "p5-n3", name: "Nozzle 3", productCode: "MS", productName: "Petrol (MS)" },
      { id: "p5-n4", name: "Nozzle 4", productCode: "SPEED", productName: "Speed" },
    ],
  },
  6: {
    name: "Pump 6",
    nozzles: [
      { id: "p6-n1", name: "Nozzle 1", productCode: "MS", productName: "Petrol (MS)" },
      { id: "p6-n2", name: "Nozzle 2", productCode: "SPEED", productName: "Speed" },
    ],
  },
};

function buildInitialPumpsData(configuredPumps?: PumpWithNozzles[]): Record<number, PumpData> {
  const result: Record<number, PumpData> = {};

  if (configuredPumps && configuredPumps.length > 0) {
    for (const p of configuredPumps) {
      const fallbackNozzles = DEFAULT_PUMP_LAYOUT[p.pumpNumber]?.nozzles || [];

      result[p.pumpNumber] = {
        pumpId: p.id,
        pumpNumber: p.pumpNumber,
        name: p.name,
        nozzles:
          p.nozzles.length > 0
            ? p.nozzles.map((nz, idx) => {
                const fb = fallbackNozzles.find((f) => f.name === nz.name) || fallbackNozzles[idx];
                return {
                  id: nz.id,
                  name: nz.name,
                  productName: nz.product?.name ?? fb?.productName ?? null,
                  productCode: nz.product?.code ?? fb?.productCode ?? null,
                  productColor: nz.product?.color ?? null,
                  open: "",
                  close: "",
                  test: "",
                };
              })
            : fallbackNozzles.map((fb) => ({
                id: `${p.id}-${fb.id}`,
                name: fb.name,
                productName: fb.productName,
                productCode: fb.productCode,
                productColor: null,
                open: "",
                close: "",
                test: "",
              })),
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
        productName: n.productName,
        productCode: n.productCode,
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
  sixAmStatus,
  staffMembers = [],
}: {
  configuredPumps?: PumpWithNozzles[];
  sixAmStatus?: SixAmStatus | null;
  staffMembers?: Array<{ id: string; name: string }>;
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
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    () => staffMembers[0]?.id ?? ""
  );
  const [pumpsData, setPumpsData] = useState<Record<number, PumpData>>(initialData);
  const [calculatedResults, setCalculatedResults] = useState<
    Record<number, PumpCalculationResult> | null
  >(null);
  const [isClosingShift, startClosingShift] = useTransition();
  const [isGatedDialogOpen, setIsGatedDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [isDenominationsOpen, setIsDenominationsOpen] = useState(false);

  const isGated = sixAmStatus ? !sixAmStatus.isReady : false;

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
    if (isGated) {
      setIsGatedDialogOpen(true);
      return;
    }

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

    setCalculatedResults((prev) => {
      if (!prev || !prev[selectedPump]) return prev;
      const copy = { ...prev };
      delete copy[selectedPump];
      return Object.keys(copy).length > 0 ? copy : null;
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
    if (isGated) {
      setIsGatedDialogOpen(true);
      return;
    }

    const results: Record<number, PumpCalculationResult> = {
      ...(calculatedResults || {}),
    };

    let hasAnyInput = false;

    const nozzleResults: CalculatedNozzle[] = [];
    let pumpGross = 0;
    let pumpTest = 0;
    let pumpNetSale = 0;
    let pumpSalesAmount = 0;
    let pumpHasErrors = false;

    const rsp = sixAmStatus?.rspPrices;

    for (const nozzle of currentPumpData.nozzles) {
      const hasNozzleInput =
        nozzle.open.trim() !== "" ||
        nozzle.close.trim() !== "" ||
        nozzle.test.trim() !== "";

      if (hasNozzleInput) {
        hasAnyInput = true;
      }

      const openVal = nozzle.open.trim() === "" ? 0 : Number(nozzle.open);
      const closeVal = nozzle.close.trim() === "" ? 0 : Number(nozzle.close);
      const testVal = nozzle.test.trim() === "" ? 0 : Number(nozzle.test);

      let error: string | undefined;

      // Only validate rules if this specific nozzle had values entered
      if (hasNozzleInput) {
        if (isNaN(openVal) || isNaN(closeVal) || isNaN(testVal)) {
          error = "Invalid number format";
          pumpHasErrors = true;
        } else if (nozzle.open.trim() !== "" && nozzle.close.trim() !== "" && closeVal < openVal) {
          error = "Closing reading cannot be less than opening reading";
          pumpHasErrors = true;
        } else if (testVal < 0) {
          error = "Testing volume cannot be negative";
          pumpHasErrors = true;
        }
      }

      const gross = hasNozzleInput ? Math.max(0, closeVal - openVal) : 0;
      const netSale = hasNozzleInput ? Math.max(0, gross - testVal) : 0;

      if (hasNozzleInput && testVal > gross && gross > 0) {
        error = "Testing exceeds gross sales volume";
        pumpHasErrors = true;
      }

      // Calculate sales amount from RSP if rate is available
      let rate = 0;
      if (rsp && nozzle.productCode) {
        const code = nozzle.productCode.toUpperCase();
        if (code === "HSD") rate = Number(rsp.hsd) || 0;
        else if (code === "MS") rate = Number(rsp.ms) || 0;
        else if (code === "SPEED") rate = Number(rsp.speed) || 0;
      }

      const salesAmount = rate > 0 ? Number((netSale * rate).toFixed(2)) : 0;

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
        ratePerLitre: rate > 0 ? rate : undefined,
        salesAmount: salesAmount > 0 ? salesAmount : undefined,
        error,
      });

      if (!error) {
        pumpGross += gross;
        pumpTest += testVal;
        pumpNetSale += netSale;
        pumpSalesAmount += salesAmount;
      }
    }

    if (!hasAnyInput) {
      toast.error("Please enter opening and closing readings to calculate.");
      return;
    }

    const errorDetails: string[] = [];
    for (const nz of nozzleResults) {
      if (nz.error) {
        errorDetails.push(`${nz.name}: ${nz.error}`);
      }
    }

    if (pumpHasErrors) {
      setValidationErrors(errorDetails);
      setIsValidationDialogOpen(true);
      setCalculatedResults((prev) => {
        if (!prev) return null;
        const copy = { ...prev };
        delete copy[selectedPump];
        return Object.keys(copy).length > 0 ? copy : null;
      });
      return;
    }

    results[selectedPump] = {
      pumpNumber: selectedPump,
      name: currentPumpData.name,
      nozzleResults,
      totalGross: Number(pumpGross.toFixed(3)),
      totalTest: Number(pumpTest.toFixed(3)),
      totalNetSale: Number(pumpNetSale.toFixed(3)),
      totalSalesAmount: Number(pumpSalesAmount.toFixed(2)),
      hasErrors: false,
    };

    setCalculatedResults(results);

    toast.success(
      `${currentPumpData.name} calculated: ₹ ${pumpSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
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
  const collectionsEnabled = Boolean(
    currentCalculation && !currentCalculation.hasErrors
  );
  const collectionsDisabled = isGated || !collectionsEnabled;

  // Totals for current pump payments
  const pumpCash = calculateDenominationCash(currentPumpData.payment.cash);
  const pumpTotalPayment = calculatePumpTotalPayment(currentPumpData.payment);

  function handleCloseShift() {
    if (!currentCalculation || currentCalculation.hasErrors) {
      toast.error("Please calculate meter readings without errors first.");
      return;
    }

    startClosingShift(async () => {
      const totalSales = currentCalculation.totalSalesAmount || 0;
      const difference = pumpTotalPayment - totalSales;

      const res = await closeInterimShiftAction({
        pumpId: currentPumpData.pumpId,
        pumpNumber: selectedPump,
        pumpName: currentPumpData.name,
        totalGross: currentCalculation.totalGross,
        totalTest: currentCalculation.totalTest,
        totalNetLitres: currentCalculation.totalNetSale,
        totalSalesAmount: totalSales,
        totalCollected: pumpTotalPayment,
        difference: difference,
        paymentBreakdown: {
          cashAmount: pumpCash,
          cashDenominations: currentPumpData.payment.cash as unknown as Record<string, unknown>,
          pinelabsCard: Number(currentPumpData.payment.pinelabsCard) || 0,
          pinelabsUpi: Number(currentPumpData.payment.pinelabsUpi) || 0,
          pinelabsAlp: Number(currentPumpData.payment.pinelabsAlp) || 0,
          pos: Number(currentPumpData.payment.pos) || 0,
          qr: Number(currentPumpData.payment.qr) || 0,
          ufill: Number(currentPumpData.payment.ufill) || 0,
          bill: Number(currentPumpData.payment.bill) || 0,
          expenses: Number(currentPumpData.payment.expenses) || 0,
          totalCollected: pumpTotalPayment,
        },
        nozzleReadings: currentCalculation.nozzleResults.map((nz) => ({
          nozzleId: nz.id,
          nozzleName: nz.name,
          openingReading: nz.open,
          closingReading: nz.close,
          testVolume: nz.test,
          netVolume: nz.netSale,
          ratePerLitre: nz.ratePerLitre ?? null,
          salesAmount: nz.salesAmount ?? null,
        })),
      });

      if (res.success) {
        toast.success(res.message || `Shift for ${currentPumpData.name} closed successfully!`);
      } else {
        toast.error(res.error || "Failed to close shift.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 6 AM Gating Modal Dialog */}
      <Dialog open={isGatedDialogOpen} onOpenChange={setIsGatedDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-destructive">
              <AlertCircle className="size-5 text-destructive shrink-0" />
              6 AM Entry Required
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground">
              You must complete the 6 AM entry for today (
              <span className="font-semibold">{sixAmStatus?.dateStr}</span>)
              before entering or calculating interim shift readings.
            </p>

            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-foreground">Missing items:</p>
              {!sixAmStatus?.hasRsp && (
                <p className="text-destructive font-medium">
                  • Daily RSP fuel prices not saved
                </p>
              )}
              {!sixAmStatus?.hasSlipEntry && (
                <p className="text-destructive font-medium">
                  • 6 AM Machine Slip readings not recorded
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <DialogClose
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-9 px-4 text-xs font-semibold cursor-pointer"
                )}
              >
                Cancel
              </DialogClose>
              <Link
                href="/shift-closing/6am"
                className={cn(
                  buttonVariants({ variant: "destructive", size: "sm" }),
                  "h-9 px-4 text-xs font-semibold gap-1.5 inline-flex items-center"
                )}
              >
                Go to 6 AM Entry
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calculation Errors Modal Dialog */}
      <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-destructive">
              <AlertCircle className="size-5 text-destructive shrink-0" />
              Calculation Warning
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2 text-sm text-foreground">
              {validationErrors.map((err, idx) => (
                <p key={idx} className="font-medium text-foreground">
                  {err}
                </p>
              ))}
            </div>

            <div className="flex items-center justify-end pt-2">
              <DialogClose
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "h-9 px-6 text-xs font-semibold cursor-pointer"
                )}
              >
                OK
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Denominations Dialog */}
      <Dialog open={isDenominationsOpen} onOpenChange={setIsDenominationsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Banknote className="size-4 text-emerald-600" />
              Cash Denominations - {currentPumpData.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2.5 py-2">
            <div className="grid grid-cols-1 gap-2">
              <DenominationRow
                multiplier={500}
                value={currentPumpData.payment.cash.d500}
                onChange={(v) => updateDenominationField("d500", v)}
                disabled={collectionsDisabled}
              />
              <DenominationRow
                multiplier={200}
                value={currentPumpData.payment.cash.d200}
                onChange={(v) => updateDenominationField("d200", v)}
                disabled={collectionsDisabled}
              />
              <DenominationRow
                multiplier={100}
                value={currentPumpData.payment.cash.d100}
                onChange={(v) => updateDenominationField("d100", v)}
                disabled={collectionsDisabled}
              />
              <DenominationRow
                multiplier={50}
                value={currentPumpData.payment.cash.d50}
                onChange={(v) => updateDenominationField("d50", v)}
                disabled={collectionsDisabled}
              />
              <DenominationRow
                multiplier={20}
                value={currentPumpData.payment.cash.d20}
                onChange={(v) => updateDenominationField("d20", v)}
                disabled={collectionsDisabled}
              />
              <DenominationRow
                multiplier={10}
                value={currentPumpData.payment.cash.d10}
                onChange={(v) => updateDenominationField("d10", v)}
                disabled={collectionsDisabled}
              />
              {/* Coins */}
              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-2 text-xs">
                <span className="font-semibold text-foreground min-w-[100px]">
                  Coins (₹)
                </span>
                <div className="flex-1 max-w-[120px]">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    disabled={collectionsDisabled}
                    value={currentPumpData.payment.cash.coins}
                    onChange={(e) => updateDenominationField("coins", e.target.value)}
                    className="h-8 text-center text-xs font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <span className="w-20 text-right font-bold text-foreground tabular-nums">
                  ₹ {(Number(currentPumpData.payment.cash.coins) || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Denomination Total */}
            <div className="flex items-center justify-between rounded-lg border-2 border-emerald-500/40 bg-emerald-50/60 p-3 mt-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Total Cash
              </span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                ₹ {pumpCash.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <DialogClose
                className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 bg-primary text-primary-foreground hover:bg-primary/80 gap-1.5 h-9 w-full px-6 text-xs font-semibold cursor-pointer"
              >
                Save
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meter Readings Card */}
      <Card className="border shadow-sm">
        <CardContent className="space-y-6 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="staff-select" className="text-sm font-medium text-foreground">
                Staff
              </Label>
              <Select
                value={selectedStaffId || undefined}
                onValueChange={(val) => val && setSelectedStaffId(val)}
                disabled={staffMembers.length === 0}
                items={staffMembers.map((member) => ({
                  value: member.id,
                  label: member.name,
                }))}
              >
                <SelectTrigger id="staff-select" className="h-11 w-full bg-background text-base font-medium">
                  <SelectValue
                    placeholder={staffMembers.length === 0 ? "No staff available" : "Select staff"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="text-sm">
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pump-select" className="text-sm font-medium text-foreground">
                Pump
              </Label>
              <Select
                value={String(selectedPump)}
                onValueChange={(val) => val && setSelectedPump(Number(val))}
                items={pumpOptions.map((num) => ({
                  value: String(num),
                  label: pumpsData[num]?.name || `Pump ${num}`,
                }))}
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
          </div>

          <div
            className={cn(
              "rounded-xl border bg-card p-2 sm:p-3 shadow-sm transition-colors",
              isGated && "cursor-pointer hover:border-destructive/40"
            )}
            onClickCapture={(e) => {
              if (isGated) {
                e.preventDefault();
                e.stopPropagation();
                setIsGatedDialogOpen(true);
              }
            }}
          >
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
                            readOnly={isGated}
                            value={nozzle.open}
                            onChange={(e) => updateNozzleField(nozzle.id, "open", e.target.value)}
                            onClick={() => {
                              if (isGated) setIsGatedDialogOpen(true);
                            }}
                            className={cn(
                              "h-10 text-center text-sm font-medium tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                              isGated && "cursor-pointer bg-muted/20",
                              nozzleCalc?.error && "border-red-500 focus-visible:ring-red-500/30"
                            )}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            step="any"
                            readOnly={isGated}
                            value={nozzle.close}
                            onChange={(e) => updateNozzleField(nozzle.id, "close", e.target.value)}
                            onClick={() => {
                              if (isGated) setIsGatedDialogOpen(true);
                            }}
                            className={cn(
                              "h-10 text-center text-sm font-medium tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                              isGated && "cursor-pointer bg-muted/20",
                              nozzleCalc?.error && "border-red-500 focus-visible:ring-red-500/30"
                            )}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            step="any"
                            readOnly={isGated}
                            value={nozzle.test}
                            onChange={(e) => updateNozzleField(nozzle.id, "test", e.target.value)}
                            onClick={() => {
                              if (isGated) setIsGatedDialogOpen(true);
                            }}
                            className={cn(
                              "h-10 text-center text-sm font-medium tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                              isGated && "cursor-pointer bg-muted/20",
                              nozzleCalc?.error && "border-red-500 focus-visible:ring-red-500/30"
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Buttons & Totals Badge */}
          <div className="space-y-4 pt-2">
            {/* Total Sales Badge - Centered (Only shown after calculate) */}
            {currentCalculation && (
              <div className="flex justify-center w-full">
                <div className="flex w-fit items-center gap-3 rounded-xl border-2 border-red-500/40 bg-red-50/60 px-6 py-3.5 shadow-2xs dark:border-red-900/60 dark:bg-red-950/30">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                    Total Sales
                  </span>
                  <span className="text-sm font-bold text-red-500 dark:text-red-400">-</span>
                  <span className="text-2xl font-bold tracking-tight text-red-700 dark:text-red-400 tabular-nums">
                    ₹ {currentCalculation.totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex w-full">
              <Button
                type="button"
                disabled={isGated}
                onClick={handleCalculate}
                className="h-10 w-full text-sm font-semibold shadow-xs gap-2"
              >
                <Calculator className="size-4" />
                Calculate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Collections Card */}
      <Card className={cn("border shadow-sm", collectionsDisabled && "opacity-60")}>
        <CardContent className="space-y-6 pt-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-semibold text-foreground">Collections</h3>
          </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Cash (with Denominations Dialog) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Cash (₹)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={collectionsDisabled}
                    onClick={() => setIsDenominationsOpen(true)}
                    className="h-6 px-1.5 text-[10px] gap-1 cursor-pointer font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Coins className="size-3 text-emerald-600 dark:text-emerald-400" />
                    Denominations
                  </Button>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-cash"
                    type="text"
                    readOnly
                    onClick={() => {
                      if (!collectionsDisabled) setIsDenominationsOpen(true);
                    }}
                    value={pumpCash > 0 ? pumpCash.toFixed(2) : "0.00"}
                    className={cn(
                      "h-10 w-full text-center text-sm font-semibold bg-muted/40 px-3 pl-7 tracking-wider tabular-nums",
                      collectionsDisabled
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer hover:bg-muted/60 transition-colors"
                    )}
                  />
                </div>
              </div>

              {/* 2. Pinelabs Card */}
              <div className="space-y-1.5">
                <Label htmlFor="pump-pinelabs-card" className="text-xs font-semibold text-foreground">
                  Pinelabs Card (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-pinelabs-card"
                    type="number"
                    step="any"
                    min="0"
                    disabled={collectionsDisabled}
                    value={currentPumpData.payment.pinelabsCard}
                    onChange={(e) => updatePaymentField("pinelabsCard", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 3. Pinelabs UPI */}
              <div className="space-y-1.5">
                <Label htmlFor="pump-pinelabs-upi" className="text-xs font-semibold text-foreground">
                  Pinelabs UPI (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-pinelabs-upi"
                    type="number"
                    step="any"
                    min="0"
                    disabled={collectionsDisabled}
                    value={currentPumpData.payment.pinelabsUpi}
                    onChange={(e) => updatePaymentField("pinelabsUpi", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 4. Pinelabs ALP */}
              <div className="space-y-1.5">
                <Label htmlFor="pump-pinelabs-alp" className="text-xs font-semibold text-foreground">
                  Pinelabs ALP (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-pinelabs-alp"
                    type="number"
                    step="any"
                    min="0"
                    disabled={collectionsDisabled}
                    value={currentPumpData.payment.pinelabsAlp}
                    onChange={(e) => updatePaymentField("pinelabsAlp", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 5. POS */}
              <div className="space-y-1.5">
                <Label htmlFor="pump-pos" className="text-xs font-semibold text-foreground">
                  POS (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-pos"
                    type="number"
                    step="any"
                    min="0"
                    disabled={collectionsDisabled}
                    value={currentPumpData.payment.pos}
                    onChange={(e) => updatePaymentField("pos", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 6. QR */}
              <div className="space-y-1.5">
                <Label htmlFor="pump-qr" className="text-xs font-semibold text-foreground">
                  QR (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-qr"
                    type="number"
                    step="any"
                    min="0"
                    disabled={collectionsDisabled}
                    value={currentPumpData.payment.qr}
                    onChange={(e) => updatePaymentField("qr", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 7. UFILL */}
              <div className="space-y-1.5">
                <Label htmlFor="pump-ufill" className="text-xs font-semibold text-foreground">
                  UFILL (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-ufill"
                    type="number"
                    step="any"
                    min="0"
                    disabled={collectionsDisabled}
                    value={currentPumpData.payment.ufill}
                    onChange={(e) => updatePaymentField("ufill", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 8. Bill */}
              <div className="space-y-1.5">
                <Label htmlFor="pump-bill" className="text-xs font-semibold text-foreground">
                  Bill (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-bill"
                    type="number"
                    step="any"
                    min="0"
                    disabled={collectionsDisabled}
                    value={currentPumpData.payment.bill}
                    onChange={(e) => updatePaymentField("bill", e.target.value)}
                    className="h-10 w-full text-center text-sm font-medium px-3 pl-7 tracking-wider tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 9. Expenses */}
              <div className="space-y-1.5">
                <Label htmlFor="pump-expenses" className="text-xs font-semibold text-foreground">
                  Expenses (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                    ₹
                  </span>
                  <Input
                    id="pump-expenses"
                    type="number"
                    step="any"
                    min="0"
                    disabled={collectionsDisabled}
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
                disabled={collectionsDisabled}
                onClick={handleResetCollections}
                className="h-9 px-4 text-xs font-semibold"
              >
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset Collections
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* Reconciliation Summary Card */}
      {(() => {
          const totalSales = currentCalculation?.totalSalesAmount || 0;
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
                          ? `- ₹ ${Math.abs(difference).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `+ ₹ ${difference.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
          disabled={isGated || !currentCalculation || currentCalculation.hasErrors || isClosingShift}
          onClick={handleCloseShift}
          className="h-10 w-full text-sm font-semibold shadow-xs gap-2"
        >
          {isClosingShift ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
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
  disabled,
}: {
  multiplier: number;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
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
          disabled={disabled}
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
