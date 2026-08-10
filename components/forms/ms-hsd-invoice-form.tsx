"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createMsHsdInvoiceAction,
  updateMsHsdInvoiceAction,
  type ActionState,
} from "@/lib/actions/ms-hsd-invoice";
import { MS_HSD_PRODUCTS, type MsHsdProduct } from "@/lib/ms-hsd/products";
import {
  computeExpectedTotalAmount,
  sumLineTaxes,
  amountsWithinTolerance,
} from "@/lib/ms-hsd/totals";
import type { MsHsdInvoiceDetail } from "@/lib/queries/ms-hsd-invoice";
import { formatInr } from "@/lib/format";
import { getIstTodayString } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialState: ActionState = { success: false };

type LineState = {
  product: MsHsdProduct;
  quantityKl: string;
  ratePerKl: string;
  totalValue: string;
  dlyTaxableCharge: string;
  vatLstRate: string;
  vatLstAmount: string;
  additionalVat: string;
};

function moneyInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(value);
}

function parseMoney(value: string): number {
  if (value.trim() === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function emptyLine(product: MsHsdProduct): LineState {
  return {
    product,
    quantityKl: "",
    ratePerKl: "",
    totalValue: "",
    dlyTaxableCharge: "",
    vatLstRate: "",
    vatLstAmount: "",
    additionalVat: "",
  };
}

function defaultLines(): LineState[] {
  return MS_HSD_PRODUCTS.map((product) => emptyLine(product));
}

function linesFromInvoice(invoice: MsHsdInvoiceDetail): LineState[] {
  const byProduct = new Map(
    invoice.lines
      .filter((line) => isKnownProduct(line.product))
      .map((line) => [line.product as MsHsdProduct, line] as const)
  );

  return MS_HSD_PRODUCTS.map((product) => {
    const existing = byProduct.get(product);
    if (!existing) return emptyLine(product);
    return {
      product,
      quantityKl: moneyInput(existing.quantityKl),
      ratePerKl: moneyInput(existing.ratePerKl),
      totalValue: moneyInput(existing.totalValue),
      dlyTaxableCharge: moneyInput(existing.dlyTaxableCharge),
      vatLstRate: moneyInput(existing.vatLstRate),
      vatLstAmount: moneyInput(existing.vatLstAmount),
      additionalVat: moneyInput(existing.additionalVat),
    };
  });
}

function isKnownProduct(value: string): value is MsHsdProduct {
  return (MS_HSD_PRODUCTS as readonly string[]).includes(value);
}

function isLineFilled(line: LineState): boolean {
  return Number(line.quantityKl) > 0 && line.quantityKl.trim() !== "";
}

export function MsHsdInvoiceForm({
  editInvoice,
}: {
  editInvoice?: MsHsdInvoiceDetail;
}) {
  const router = useRouter();
  const isEdit = editInvoice != null;
  const [state, formAction, pending] = useActionState(
    isEdit ? updateMsHsdInvoiceAction : createMsHsdInvoiceAction,
    initialState
  );

  const [invoiceNo, setInvoiceNo] = useState(editInvoice?.invoiceNo ?? "");
  const [invoiceDate, setInvoiceDate] = useState(
    editInvoice?.invoiceDate ?? getIstTodayString()
  );
  const [vatStaxCessTotal, setVatStaxCessTotal] = useState(
    editInvoice ? moneyInput(editInvoice.vatStaxCessTotal) : ""
  );
  const [roundingOff, setRoundingOff] = useState(
    editInvoice ? moneyInput(editInvoice.roundingOff) : ""
  );
  const [totalAmount, setTotalAmount] = useState(
    editInvoice ? moneyInput(editInvoice.totalAmount) : ""
  );
  const [lines, setLines] = useState<LineState[]>(() =>
    editInvoice ? linesFromInvoice(editInvoice) : defaultLines()
  );

  const headerReady =
    invoiceNo.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(invoiceDate);

  const filledLines = useMemo(
    () => lines.filter(isLineFilled),
    [lines]
  );

  const computed = useMemo(() => {
    const amounts = filledLines.map((line) => ({
      totalValue: parseMoney(line.totalValue),
      dlyTaxableCharge: parseMoney(line.dlyTaxableCharge),
      vatLstAmount: parseMoney(line.vatLstAmount),
      additionalVat: parseMoney(line.additionalVat),
    }));
    const taxSum = sumLineTaxes(amounts);
    const expectedTotal = computeExpectedTotalAmount(
      amounts,
      parseMoney(roundingOff)
    );
    return { taxSum, expectedTotal };
  }, [filledLines, roundingOff]);

  useEffect(() => {
    if (filledLines.length === 0) {
      setVatStaxCessTotal("");
      setTotalAmount("");
      return;
    }
    setVatStaxCessTotal(computed.taxSum.toFixed(2));
    setTotalAmount(computed.expectedTotal.toFixed(2));
  }, [computed.taxSum, computed.expectedTotal, filledLines.length]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push("/invoice-purchase/ms-hsd-receipts");
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  function updateLine(product: MsHsdProduct, patch: Partial<LineState>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.product !== product) return line;
        const next = { ...line, ...patch };
        if ("quantityKl" in patch || "ratePerKl" in patch) {
          const qty = Number(next.quantityKl);
          const rate = parseMoney(next.ratePerKl);
          if (Number.isFinite(qty) && qty > 0 && rate > 0) {
            next.totalValue = (qty * rate).toFixed(2);
          } else if (
            next.quantityKl.trim() === "" ||
            next.ratePerKl.trim() === ""
          ) {
            next.totalValue = "";
          }
        }
        if (
          "quantityKl" in patch ||
          "ratePerKl" in patch ||
          "totalValue" in patch ||
          "dlyTaxableCharge" in patch ||
          "vatLstRate" in patch
        ) {
          const taxableBase =
            parseMoney(next.totalValue) + parseMoney(next.dlyTaxableCharge);
          const vatRate = parseMoney(next.vatLstRate);
          if (taxableBase > 0 && vatRate > 0) {
            next.vatLstAmount = ((taxableBase * vatRate) / 100).toFixed(2);
          } else if (
            next.totalValue.trim() === "" &&
            next.dlyTaxableCharge.trim() === ""
          ) {
            next.vatLstAmount = "";
          } else if (vatRate <= 0 || next.vatLstRate.trim() === "") {
            next.vatLstAmount = "";
          }
        }
        return next;
      })
    );
  }

  function handleSubmit(formData: FormData) {
    if (!headerReady) {
      toast.error("Invoice number and date are required.");
      return;
    }

    const payload = [];
    for (const line of lines) {
      if (!isLineFilled(line)) continue;
      payload.push({
        product: line.product,
        quantityKl: Number(line.quantityKl),
        ratePerKl: parseMoney(line.ratePerKl),
        totalValue: parseMoney(line.totalValue),
        dlyTaxableCharge: parseMoney(line.dlyTaxableCharge),
        vatLstRate: parseMoney(line.vatLstRate),
        vatLstAmount: parseMoney(line.vatLstAmount),
        additionalVat: parseMoney(line.additionalVat),
      });
    }

    if (payload.length === 0) {
      toast.error("Enter quantity for at least one product.");
      return;
    }

    formData.set("invoiceNo", invoiceNo.trim());
    formData.set("invoiceDate", invoiceDate);
    formData.set("vatStaxCessTotal", String(parseMoney(vatStaxCessTotal)));
    formData.set("roundingOff", String(parseMoney(roundingOff)));
    formData.set("totalAmount", String(parseMoney(totalAmount)));
    formData.set("lines", JSON.stringify(payload));
    if (isEdit) {
      formData.set("invoiceId", editInvoice.id);
    }
    formAction(formData);
  }

  const vatMatches =
    filledLines.length > 0 &&
    amountsWithinTolerance(computed.taxSum, parseMoney(vatStaxCessTotal));
  const totalMatches =
    filledLines.length > 0 &&
    amountsWithinTolerance(computed.expectedTotal, parseMoney(totalAmount));

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card className="border shadow-sm">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoiceNo">Invoice number *</Label>
            <Input
              id="invoiceNo"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. 1022046032"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice date *</Label>
            <DatePicker
              id="invoiceDate"
              value={invoiceDate}
              onChange={setInvoiceDate}
              required
              className="h-8 shadow-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="space-y-3 p-2 sm:p-3">
          <div className="isolate overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="h-8 min-w-[6rem] px-1.5">Product</TableHead>
                  <TableHead className="h-8 min-w-[5.5rem] px-1.5">Qty (KL)</TableHead>
                  <TableHead className="h-8 min-w-[6.5rem] px-1.5">Rate / KL</TableHead>
                  <TableHead className="h-8 min-w-[6.5rem] px-1.5">Total value</TableHead>
                  <TableHead className="h-8 min-w-[6.5rem] px-1.5">DLY charge</TableHead>
                  <TableHead className="h-8 min-w-[5rem] px-1.5">VAT %</TableHead>
                  <TableHead className="h-8 min-w-[6rem] px-1.5">VAT amt</TableHead>
                  <TableHead className="h-8 min-w-[6.5rem] px-1.5">Addl VAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const disabled = !headerReady || pending;

                  return (
                    <TableRow key={line.product}>
                      <TableCell className="px-1.5 py-1.5 align-middle font-medium">
                        {line.product}
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 align-middle">
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          inputMode="decimal"
                          className="h-8"
                          disabled={disabled}
                          value={line.quantityKl}
                          onChange={(e) =>
                            updateLine(line.product, {
                              quantityKl: e.target.value,
                            })
                          }
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="h-8"
                          disabled={disabled}
                          value={line.ratePerKl}
                          onChange={(e) =>
                            updateLine(line.product, {
                              ratePerKl: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="h-8"
                          disabled={disabled}
                          value={line.totalValue}
                          onChange={(e) =>
                            updateLine(line.product, {
                              totalValue: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          title="Qty × Rate / KL (editable)"
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="h-8"
                          disabled={disabled}
                          value={line.dlyTaxableCharge}
                          onChange={(e) =>
                            updateLine(line.product, {
                              dlyTaxableCharge: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="h-8"
                          disabled={disabled}
                          value={line.vatLstRate}
                          onChange={(e) =>
                            updateLine(line.product, {
                              vatLstRate: e.target.value,
                            })
                          }
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="h-8"
                          disabled={disabled}
                          value={line.vatLstAmount}
                          onChange={(e) =>
                            updateLine(line.product, {
                              vatLstAmount: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          title="(Total value + DLY) × VAT % (editable)"
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          className="h-8"
                          disabled={disabled}
                          value={line.additionalVat}
                          onChange={(e) =>
                            updateLine(line.product, {
                              additionalVat: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 px-1 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vatStaxCessTotal">VAT / STAX / CESS total *</Label>
              <Input
                id="vatStaxCessTotal"
                type="number"
                step="0.01"
                inputMode="decimal"
                disabled={!headerReady || pending}
                value={vatStaxCessTotal}
                onChange={(e) => setVatStaxCessTotal(e.target.value)}
                placeholder="0.00"
                title="Sum of VAT amt + Addl VAT across lines (editable)"
              />
              {filledLines.length > 0 && !vatMatches ? (
                <p className="text-xs text-destructive">
                  Lines sum to {formatInr(computed.taxSum)}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="roundingOff">Rounding off</Label>
              <Input
                id="roundingOff"
                type="number"
                step="0.01"
                inputMode="decimal"
                disabled={!headerReady || pending}
                value={roundingOff}
                onChange={(e) => setRoundingOff(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total amount *</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                inputMode="decimal"
                disabled={!headerReady || pending}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                title="Line values + DLY + VAT + Addl VAT + rounding (editable)"
              />
              {filledLines.length > 0 && !totalMatches ? (
                <p className="text-xs text-destructive">
                  Expected {formatInr(computed.expectedTotal)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push("/invoice-purchase/ms-hsd-receipts")
              }
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!headerReady || pending || filledLines.length === 0}
            >
              {pending
                ? isEdit
                  ? "Updating…"
                  : "Saving…"
                : isEdit
                  ? "Update invoice"
                  : "Save invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
