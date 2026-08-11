"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OilProduct } from "@/lib/db/schema";
import {
  receiveBpclStockAction,
  updateBpclStockAction,
  type ActionState,
} from "@/lib/actions/inventory";
import type { BpclInvoiceLine } from "@/lib/queries/bpcl-invoice";
import {
  computeLandingPrice,
  formatLandingPrice,
  invoiceDiscountPerPacket,
  invoiceRoundingPerPacket,
} from "@/lib/inventory/landing-price";
import {
  computeExpectedTotalAmount,
  sumLineCgst,
  sumLineSgst,
} from "@/lib/inventory/bpcl-totals";
import { amountsWithinTolerance } from "@/lib/ms-hsd/totals";
import { formatInr } from "@/lib/format";
import { formatPacketSizeLabel } from "@/lib/products/display";
import { getPacketsPerBox, hasBoxPackaging } from "@/lib/packaging";
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
  quantity: string;
  returned: string;
  taxableValue: string;
  cgstAmount: string;
  sgstAmount: string;
  discountAmount: string;
};

function emptyLine(): LineState {
  return {
    quantity: "",
    returned: "",
    taxableValue: "",
    cgstAmount: "",
    sgstAmount: "",
    discountAmount: "",
  };
}

function parseMoney(value: string): number {
  if (value.trim() === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseReturnedCases(value: string): number {
  if (value.trim() === "") return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

function goodCasesForLine(line: LineState): number | null {
  const qty = Number(line.quantity);
  const returned = parseReturnedCases(line.returned);
  if (!Number.isInteger(qty) || qty < 1) return null;
  if (returned > qty) return null;
  const good = qty - returned;
  return good >= 1 ? good : null;
}

function moneyInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(value);
}

function lineLandingPrice(
  product: OilProduct,
  line: LineState,
  perPacketInvoiceDiscount = 0,
  perPacketRounding = 0
): number | null {
  // Landing uses full invoice qty (incl. returned); stock still uses good cases.
  if (goodCasesForLine(line) == null) return null;
  const invoiceCases = Number(line.quantity);
  const packetsPerBox = getPacketsPerBox(product);
  if (!Number.isInteger(invoiceCases) || invoiceCases < 1 || packetsPerBox == null) {
    return null;
  }
  return computeLandingPrice({
    taxableValue: parseMoney(line.taxableValue),
    discountAmount: parseMoney(line.discountAmount),
    cgstAmount: parseMoney(line.cgstAmount),
    sgstAmount: parseMoney(line.sgstAmount),
    boxQuantity: invoiceCases,
    packetsPerBox,
    invoiceDiscountPerPacket: perPacketInvoiceDiscount,
    invoiceRoundingPerPacket: perPacketRounding,
  });
}

function linesFromInvoice(
  products: OilProduct[],
  invoiceLines: BpclInvoiceLine[]
): Record<string, LineState> {
  const byProduct = new Map(invoiceLines.map((line) => [line.productId, line]));
  return Object.fromEntries(
    products.map((product) => {
      const existing = byProduct.get(product.id);
      if (!existing) return [product.id, emptyLine()] as const;
      const invoiceQty = existing.packageCount + existing.returnedCases;
      return [
        product.id,
        {
          quantity: invoiceQty > 0 ? String(invoiceQty) : "",
          returned:
            existing.returnedCases > 0 ? String(existing.returnedCases) : "",
          taxableValue: moneyInput(existing.taxableValue),
          cgstAmount: moneyInput(existing.cgstAmount),
          sgstAmount: moneyInput(existing.sgstAmount),
          discountAmount: moneyInput(existing.discountAmount),
        },
      ] as const;
    })
  );
}

export function BpclReceiveForm({
  products,
  editInvoice,
}: {
  products: OilProduct[];
  editInvoice?: {
    originalInvoice: string;
    transactionDate: string;
    lines: BpclInvoiceLine[];
  };
}) {
  const router = useRouter();
  const isEdit = editInvoice != null;
  const [state, formAction, pending] = useActionState(
    isEdit ? updateBpclStockAction : receiveBpclStockAction,
    initialState
  );
  const today = getIstTodayString();
  const [invoice, setInvoice] = useState(editInvoice?.originalInvoice ?? "");
  const [transactionDate, setTransactionDate] = useState(
    editInvoice?.transactionDate ?? today
  );
  const [additionalDiscount, setAdditionalDiscount] = useState("");
  const [totalCgst, setTotalCgst] = useState("");
  const [totalSgst, setTotalSgst] = useState("");
  const [roundingOff, setRoundingOff] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    editInvoice
      ? linesFromInvoice(products, editInvoice.lines)
      : Object.fromEntries(products.map((p) => [p.id, emptyLine()]))
  );

  const headerReady =
    invoice.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(transactionDate);

  const filledLineAmounts = useMemo(() => {
    const amounts = [];
    let totalPackets = 0;
    for (const product of products) {
      const line = lines[product.id] ?? emptyLine();
      if (goodCasesForLine(line) == null) continue;
      const packetsPerBox = getPacketsPerBox(product);
      const invoiceCases = Number(line.quantity);
      if (packetsPerBox != null && Number.isInteger(invoiceCases)) {
        totalPackets += invoiceCases * packetsPerBox;
      }
      amounts.push({
        taxableValue: parseMoney(line.taxableValue),
        discountAmount: parseMoney(line.discountAmount),
        cgstAmount: parseMoney(line.cgstAmount),
        sgstAmount: parseMoney(line.sgstAmount),
      });
    }
    return { amounts, totalPackets };
  }, [lines, products]);

  const filledCount = filledLineAmounts.amounts.length;

  const computed = useMemo(() => {
    const cgstSum = sumLineCgst(filledLineAmounts.amounts);
    const sgstSum = sumLineSgst(filledLineAmounts.amounts);
    const expectedTotal = computeExpectedTotalAmount(
      filledLineAmounts.amounts,
      parseMoney(additionalDiscount),
      parseMoney(roundingOff)
    );
    return { cgstSum, sgstSum, expectedTotal };
  }, [filledLineAmounts.amounts, additionalDiscount, roundingOff]);

  const perPacketInvoiceDiscount = useMemo(
    () =>
      invoiceDiscountPerPacket(
        parseMoney(additionalDiscount),
        filledLineAmounts.totalPackets
      ),
    [additionalDiscount, filledLineAmounts.totalPackets]
  );

  const perPacketRounding = useMemo(
    () =>
      invoiceRoundingPerPacket(
        parseMoney(roundingOff),
        filledLineAmounts.totalPackets
      ),
    [roundingOff, filledLineAmounts.totalPackets]
  );

  useEffect(() => {
    if (filledCount === 0) {
      setTotalCgst("");
      setTotalSgst("");
      setTotalAmount("");
      return;
    }
    setTotalCgst(computed.cgstSum.toFixed(2));
    setTotalSgst(computed.sgstSum.toFixed(2));
    setTotalAmount(computed.expectedTotal.toFixed(2));
  }, [computed.cgstSum, computed.sgstSum, computed.expectedTotal, filledCount]);

  useEffect(() => {
    setLines((prev) => {
      const next = { ...prev };
      for (const product of products) {
        if (!next[product.id]) next[product.id] = emptyLine();
      }
      return next;
    });
  }, [products]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push("/receive");
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  function updateLine(productId: string, patch: Partial<LineState>) {
    setLines((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] ?? emptyLine()), ...patch },
    }));
  }

  function handleSubmit(formData: FormData) {
    if (!headerReady) {
      toast.error("Invoice number and date are required.");
      return;
    }

    const payload = [];
    for (const product of products) {
      const line = lines[product.id] ?? emptyLine();
      const qty = Number(line.quantity);
      if (!Number.isInteger(qty) || qty < 1) continue;

      const returned = parseReturnedCases(line.returned);
      if (
        line.returned.trim() !== "" &&
        (!Number.isInteger(Number(line.returned)) || Number(line.returned) < 0)
      ) {
        toast.error(`${product.name}: returned must be a whole number.`);
        return;
      }
      if (returned > qty) {
        toast.error(`${product.name}: returned cases cannot exceed quantity.`);
        return;
      }
      if (qty - returned < 1) {
        toast.error(
          `${product.name}: at least one good case is required after returned.`
        );
        return;
      }

      if (!hasBoxPackaging(product) || getPacketsPerBox(product) == null) {
        toast.error(
          `${product.name} is missing case packaging. Update the product first.`
        );
        return;
      }

      payload.push({
        productId: product.id,
        quantity: qty,
        returned,
        taxableValue: parseMoney(line.taxableValue),
        cgstAmount: parseMoney(line.cgstAmount),
        sgstAmount: parseMoney(line.sgstAmount),
        discountAmount: parseMoney(line.discountAmount),
      });
    }

    if (payload.length === 0) {
      toast.error("Enter quantity for at least one product.");
      return;
    }

    formData.set("invoice", invoice.trim());
    formData.set("transactionDate", transactionDate);
    formData.set("additionalDiscount", String(parseMoney(additionalDiscount)));
    formData.set("totalCgst", String(parseMoney(totalCgst)));
    formData.set("totalSgst", String(parseMoney(totalSgst)));
    formData.set("roundingOff", String(parseMoney(roundingOff)));
    formData.set("totalAmount", String(parseMoney(totalAmount)));
    formData.set("lines", JSON.stringify(payload));
    if (isEdit) {
      formData.set("originalInvoice", editInvoice.originalInvoice);
    }
    formAction(formData);
  }

  const footerDisabled = !headerReady || pending || filledCount === 0;
  const cgstMatches =
    filledCount > 0 &&
    amountsWithinTolerance(computed.cgstSum, parseMoney(totalCgst));
  const sgstMatches =
    filledCount > 0 &&
    amountsWithinTolerance(computed.sgstSum, parseMoney(totalSgst));
  const totalMatches =
    filledCount > 0 &&
    amountsWithinTolerance(computed.expectedTotal, parseMoney(totalAmount));

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card className="border shadow-sm">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoice">Invoice number *</Label>
            <Input
              id="invoice"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              placeholder="e.g. BPCL-INV-2041"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transactionDate">Date *</Label>
            <DatePicker
              id="transactionDate"
              value={transactionDate}
              onChange={setTransactionDate}
              required
              className="h-8 shadow-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="space-y-3 p-2 sm:p-3">
          {products.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active oil products. Add products under Oil Products first.
            </p>
          ) : (
            <div className="isolate overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="sticky left-0 z-[1] h-8 w-32 min-w-32 max-w-32 px-1.5 bg-muted">
                      Oil Type
                    </TableHead>
                    <TableHead className="sticky left-32 z-[1] h-8 w-14 min-w-14 max-w-14 border-r px-1.5 bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">
                      Size
                    </TableHead>
                    <TableHead className="h-8 min-w-[5.5rem] px-1.5">Qty (cases)</TableHead>
                    <TableHead className="h-8 min-w-[6.5rem] px-1.5">
                      Returned Qty (cases)
                    </TableHead>
                    <TableHead className="h-8 min-w-[6.5rem] px-1.5">Taxable</TableHead>
                    <TableHead className="h-8 min-w-[5.5rem] px-1.5">CGST</TableHead>
                    <TableHead className="h-8 min-w-[5.5rem] px-1.5">SGST</TableHead>
                    <TableHead className="h-8 min-w-[6rem] px-1.5">Discount</TableHead>
                    <TableHead className="h-8 min-w-[7rem] px-1.5">Landing / piece</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const line = lines[product.id] ?? emptyLine();
                    const landing = lineLandingPrice(
                      product,
                      line,
                      perPacketInvoiceDiscount,
                      perPacketRounding
                    );
                    const canEnter =
                      hasBoxPackaging(product) &&
                      getPacketsPerBox(product) != null;
                    const disabled = !headerReady || pending || !canEnter;

                    return (
                      <TableRow key={product.id} className="group">
                        <TableCell className="sticky left-0 z-[1] w-32 min-w-32 max-w-32 whitespace-normal bg-card px-1.5 py-1.5 font-medium align-middle group-hover:bg-muted/50">
                          {product.name}
                        </TableCell>
                        <TableCell className="sticky left-32 z-[1] w-14 min-w-14 max-w-14 whitespace-normal border-r bg-card px-1.5 py-1.5 align-middle text-sm text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)] group-hover:bg-muted/50">
                          {formatPacketSizeLabel(product) ?? "—"}
                        </TableCell>
                        <TableCell className="px-1.5 py-1.5 align-middle">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            className="h-8"
                            disabled={disabled}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(product.id, {
                                quantity: e.target.value,
                              })
                            }
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="px-1.5 py-1.5 align-middle">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            className="h-8"
                            disabled={disabled}
                            value={line.returned}
                            onChange={(e) =>
                              updateLine(product.id, {
                                returned: e.target.value,
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
                            value={line.taxableValue}
                            onChange={(e) =>
                              updateLine(product.id, {
                                taxableValue: e.target.value,
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
                            value={line.cgstAmount}
                            onChange={(e) =>
                              updateLine(product.id, {
                                cgstAmount: e.target.value,
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
                            value={line.sgstAmount}
                            onChange={(e) =>
                              updateLine(product.id, {
                                sgstAmount: e.target.value,
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
                            value={line.discountAmount}
                            onChange={(e) =>
                              updateLine(product.id, {
                                discountAmount: e.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="px-1.5 py-1.5 align-middle text-sm text-muted-foreground">
                          {landing != null
                            ? `₹${formatLandingPrice(landing)}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {!isEdit ? (
                <div className="space-y-2">
                  <Label htmlFor="additionalDiscount">
                    Additional discount (if any)
                  </Label>
                  <Input
                    id="additionalDiscount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    disabled={footerDisabled}
                    value={additionalDiscount}
                    onChange={(e) => setAdditionalDiscount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="totalCgst">Total CGST</Label>
                <Input
                  id="totalCgst"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  disabled={footerDisabled}
                  value={totalCgst}
                  onChange={(e) => setTotalCgst(e.target.value)}
                  placeholder="0.00"
                  title="Sum of line CGST (editable)"
                />
                {filledCount > 0 && !cgstMatches ? (
                  <p className="text-xs text-destructive">
                    Lines sum to {formatInr(computed.cgstSum)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalSgst">Total SGST</Label>
                <Input
                  id="totalSgst"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  disabled={footerDisabled}
                  value={totalSgst}
                  onChange={(e) => setTotalSgst(e.target.value)}
                  placeholder="0.00"
                  title="Sum of line SGST (editable)"
                />
                {filledCount > 0 && !sgstMatches ? (
                  <p className="text-xs text-destructive">
                    Lines sum to {formatInr(computed.sgstSum)}
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
                  disabled={footerDisabled}
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
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  disabled={footerDisabled}
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  title="Taxable − discounts + CGST + SGST + rounding (editable)"
                />
                {filledCount > 0 && !totalMatches ? (
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
                onClick={() => router.push("/receive")}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!headerReady || pending || filledCount === 0}
              >
                {pending
                  ? isEdit
                    ? "Updating…"
                    : "Saving…"
                  : isEdit
                    ? "Update invoice"
                    : "Save receipt"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
