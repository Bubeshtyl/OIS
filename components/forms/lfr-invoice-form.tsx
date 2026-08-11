"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createLfrInvoiceAction,
  updateLfrInvoiceAction,
  type ActionState,
} from "@/lib/actions/lfr-invoice";
import {
  LFR_DEFAULT_CGST_RATE,
  LFR_DEFAULT_DESCRIPTION,
  LFR_DEFAULT_SGST_RATE,
} from "@/lib/lfr/defaults";
import {
  amountsWithinTolerance,
  computeExpectedTotalAmount,
  computeTaxAmount,
} from "@/lib/lfr/totals";
import type { LfrInvoiceDetail } from "@/lib/queries/lfr-invoice";
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

function moneyInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(value);
}

function parseMoney(value: string): number {
  if (value.trim() === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function LfrInvoiceForm({
  editInvoice,
}: {
  editInvoice?: LfrInvoiceDetail;
}) {
  const router = useRouter();
  const isEdit = editInvoice != null;
  const [state, formAction, pending] = useActionState(
    isEdit ? updateLfrInvoiceAction : createLfrInvoiceAction,
    initialState
  );

  const [invoiceNo, setInvoiceNo] = useState(editInvoice?.invoiceNo ?? "");
  const [invoiceDate, setInvoiceDate] = useState(
    editInvoice?.invoiceDate ?? getIstTodayString()
  );
  const [hsnSac, setHsnSac] = useState(editInvoice?.hsnSac ?? "");
  const [taxableAmount, setTaxableAmount] = useState(
    editInvoice ? moneyInput(editInvoice.taxableAmount) : ""
  );
  const [cgstRate, setCgstRate] = useState(
    editInvoice
      ? moneyInput(editInvoice.cgstRate)
      : String(LFR_DEFAULT_CGST_RATE)
  );
  const [sgstRate, setSgstRate] = useState(
    editInvoice
      ? moneyInput(editInvoice.sgstRate)
      : String(LFR_DEFAULT_SGST_RATE)
  );
  const [cgstAmount, setCgstAmount] = useState(
    editInvoice ? moneyInput(editInvoice.cgstAmount) : ""
  );
  const [sgstAmount, setSgstAmount] = useState(
    editInvoice ? moneyInput(editInvoice.sgstAmount) : ""
  );
  const [totalAmount, setTotalAmount] = useState(
    editInvoice ? moneyInput(editInvoice.totalAmount) : ""
  );

  const headerReady =
    invoiceNo.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(invoiceDate);

  const computed = useMemo(() => {
    const taxable = parseMoney(taxableAmount);
    const expectedCgst = computeTaxAmount(taxable, parseMoney(cgstRate));
    const expectedSgst = computeTaxAmount(taxable, parseMoney(sgstRate));
    const expectedTotal = computeExpectedTotalAmount(
      taxable,
      parseMoney(cgstAmount) || expectedCgst,
      parseMoney(sgstAmount) || expectedSgst
    );
    return { taxable, expectedCgst, expectedSgst, expectedTotal };
  }, [taxableAmount, cgstRate, sgstRate, cgstAmount, sgstAmount]);

  useEffect(() => {
    if (computed.taxable <= 0) {
      setCgstAmount("");
      setSgstAmount("");
      setTotalAmount("");
      return;
    }
    setCgstAmount(computed.expectedCgst.toFixed(2));
    setSgstAmount(computed.expectedSgst.toFixed(2));
  }, [computed.taxable, computed.expectedCgst, computed.expectedSgst]);

  useEffect(() => {
    if (computed.taxable <= 0) return;
    const nextTotal = computeExpectedTotalAmount(
      computed.taxable,
      parseMoney(cgstAmount),
      parseMoney(sgstAmount)
    );
    setTotalAmount(nextTotal.toFixed(2));
  }, [computed.taxable, cgstAmount, sgstAmount]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push("/invoice-purchase/lfr-receipts");
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  function handleSubmit(formData: FormData) {
    if (!headerReady) {
      toast.error("Invoice number and date are required.");
      return;
    }
    if (parseMoney(taxableAmount) <= 0) {
      toast.error("Taxable amount must be greater than 0.");
      return;
    }

    formData.set("invoiceNo", invoiceNo.trim());
    formData.set("invoiceDate", invoiceDate);
    formData.set("description", LFR_DEFAULT_DESCRIPTION);
    formData.set("itemCodeText", "");
    formData.set("hsnSac", hsnSac.trim());
    formData.set("taxableAmount", String(parseMoney(taxableAmount)));
    formData.set("cgstRate", String(parseMoney(cgstRate)));
    formData.set("cgstAmount", String(parseMoney(cgstAmount)));
    formData.set("sgstRate", String(parseMoney(sgstRate)));
    formData.set("sgstAmount", String(parseMoney(sgstAmount)));
    formData.set("totalAmount", String(parseMoney(totalAmount)));
    if (isEdit) {
      formData.set("invoiceId", editInvoice.id);
    }
    formAction(formData);
  }

  const disabled = !headerReady || pending;
  const totalMatches =
    computed.taxable > 0 &&
    amountsWithinTolerance(
      computeExpectedTotalAmount(
        parseMoney(taxableAmount),
        parseMoney(cgstAmount),
        parseMoney(sgstAmount)
      ),
      parseMoney(totalAmount)
    );

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
              placeholder="e.g. FIIN192710025354"
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
                  <TableHead className="h-8 min-w-[7rem] px-1.5">
                    Description of Goods
                  </TableHead>
                  <TableHead className="h-8 min-w-[5.5rem] px-1.5">
                    HSN/SAC
                  </TableHead>
                  <TableHead className="h-8 min-w-[7rem] px-1.5">
                    Taxable Amount
                  </TableHead>
                  <TableHead className="h-8 min-w-[5.5rem] px-1.5">
                    Tax Type
                  </TableHead>
                  <TableHead className="h-8 min-w-[5.5rem] px-1.5">
                    Tax %
                  </TableHead>
                  <TableHead className="h-8 min-w-[7rem] px-1.5">
                    Tax Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell
                    rowSpan={2}
                    className="px-1.5 py-1.5 align-middle font-medium"
                  >
                    {LFR_DEFAULT_DESCRIPTION}
                  </TableCell>
                  <TableCell rowSpan={2} className="px-1.5 py-1.5 align-middle">
                    <Input
                      value={hsnSac}
                      onChange={(e) => setHsnSac(e.target.value)}
                      placeholder="e.g. 997319"
                      className="h-8"
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell rowSpan={2} className="px-1.5 py-1.5 align-middle">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="h-8"
                      disabled={disabled}
                      value={taxableAmount}
                      onChange={(e) => setTaxableAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell className="px-1.5 py-1.5 align-middle font-medium">
                    CGST
                  </TableCell>
                  <TableCell className="px-1.5 py-1.5 align-middle">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="h-8"
                      disabled={disabled}
                      value={cgstRate}
                      onChange={(e) => setCgstRate(e.target.value)}
                      placeholder="9"
                    />
                  </TableCell>
                  <TableCell className="px-1.5 py-1.5 align-middle tabular-nums text-muted-foreground">
                    {parseMoney(cgstAmount) > 0
                      ? formatInr(parseMoney(cgstAmount))
                      : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="px-1.5 py-1.5 align-middle font-medium">
                    SGST
                  </TableCell>
                  <TableCell className="px-1.5 py-1.5 align-middle">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="h-8"
                      disabled={disabled}
                      value={sgstRate}
                      onChange={(e) => setSgstRate(e.target.value)}
                      placeholder="9"
                    />
                  </TableCell>
                  <TableCell className="px-1.5 py-1.5 align-middle tabular-nums text-muted-foreground">
                    {parseMoney(sgstAmount) > 0
                      ? formatInr(parseMoney(sgstAmount))
                      : "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 rounded-md border bg-muted/30 px-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="totalTaxableAmount" className="text-xs">
                Total Taxable Amount
              </Label>
              <Input
                id="totalTaxableAmount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="h-8"
                disabled={disabled}
                value={taxableAmount}
                onChange={(e) => setTaxableAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalCgst" className="text-xs">
                Total CGST
              </Label>
              <Input
                id="totalCgst"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="h-8"
                disabled={disabled}
                value={cgstAmount}
                onChange={(e) => setCgstAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalSgst" className="text-xs">
                Total SGST
              </Label>
              <Input
                id="totalSgst"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="h-8"
                disabled={disabled}
                value={sgstAmount}
                onChange={(e) => setSgstAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalAmount" className="text-xs">
                Total Amount
              </Label>
              <Input
                id="totalAmount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="h-8"
                disabled={disabled}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
              />
              {computed.taxable > 0 && !totalMatches ? (
                <p className="text-xs text-destructive">
                  Expected{" "}
                  {formatInr(
                    computeExpectedTotalAmount(
                      parseMoney(taxableAmount),
                      parseMoney(cgstAmount),
                      parseMoney(sgstAmount)
                    )
                  )}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/invoice-purchase/lfr-receipts")}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !headerReady || pending || parseMoney(taxableAmount) <= 0
              }
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
