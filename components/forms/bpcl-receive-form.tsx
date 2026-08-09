"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OilProduct } from "@/lib/db/schema";
import {
  receiveBpclStockAction,
  type ActionState,
} from "@/lib/actions/inventory";
import {
  computeLandingPrice,
  formatLandingPrice,
  invoiceDiscountPerPacket,
} from "@/lib/inventory/landing-price";
import { formatPackSizes } from "@/lib/products/display";
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
  taxableValue: string;
  cgstAmount: string;
  sgstAmount: string;
  discountAmount: string;
};

function emptyLine(): LineState {
  return {
    quantity: "",
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

function lineLandingPrice(
  product: OilProduct,
  line: LineState,
  perPacketInvoiceDiscount = 0
): number | null {
  const qty = Number(line.quantity);
  const packetsPerBox = getPacketsPerBox(product);
  if (!Number.isInteger(qty) || qty < 1 || packetsPerBox == null) return null;
  return computeLandingPrice({
    taxableValue: parseMoney(line.taxableValue),
    discountAmount: parseMoney(line.discountAmount),
    cgstAmount: parseMoney(line.cgstAmount),
    sgstAmount: parseMoney(line.sgstAmount),
    boxQuantity: qty,
    packetsPerBox,
    invoiceDiscountPerPacket: perPacketInvoiceDiscount,
  });
}

export function BpclReceiveForm({ products }: { products: OilProduct[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    receiveBpclStockAction,
    initialState
  );
  const today = getIstTodayString();
  const [invoice, setInvoice] = useState("");
  const [transactionDate, setTransactionDate] = useState(today);
  const [additionalDiscount, setAdditionalDiscount] = useState("");
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(products.map((p) => [p.id, emptyLine()]))
  );

  const headerReady =
    invoice.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(transactionDate);

  const filledCount = useMemo(() => {
    return products.filter((p) => {
      const qty = Number(lines[p.id]?.quantity);
      return Number.isInteger(qty) && qty >= 1;
    }).length;
  }, [lines, products]);

  const perPacketInvoiceDiscount = useMemo(() => {
    let totalPackets = 0;
    for (const product of products) {
      const qty = Number(lines[product.id]?.quantity);
      const packetsPerBox = getPacketsPerBox(product);
      if (!Number.isInteger(qty) || qty < 1 || packetsPerBox == null) continue;
      totalPackets += qty * packetsPerBox;
    }
    return invoiceDiscountPerPacket(parseMoney(additionalDiscount), totalPackets);
  }, [additionalDiscount, lines, products]);

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

      if (!hasBoxPackaging(product) || getPacketsPerBox(product) == null) {
        toast.error(
          `${product.name} is missing box packaging. Update the product first.`
        );
        return;
      }

      payload.push({
        productId: product.id,
        quantity: qty,
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
    formData.set("lines", JSON.stringify(payload));
    formAction(formData);
  }

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
        <CardContent className="space-y-3 p-4">
          {products.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No active oil products. Add products under Oil Products first.
            </p>
          ) : (
            <div className="isolate rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead className="sticky left-0 z-[1] w-40 min-w-40 max-w-40 bg-muted">
                      Oil Type
                    </TableHead>
                    <TableHead className="sticky left-40 z-[1] w-32 min-w-32 max-w-32 border-r bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">
                      Size
                    </TableHead>
                    <TableHead className="min-w-[5.5rem]">Qty (cases)</TableHead>
                    <TableHead className="min-w-[6.5rem]">Taxable</TableHead>
                    <TableHead className="min-w-[5.5rem]">CGST</TableHead>
                    <TableHead className="min-w-[5.5rem]">SGST</TableHead>
                    <TableHead className="min-w-[6rem]">Discount</TableHead>
                    <TableHead className="min-w-[7rem]">Landing / pkt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const line = lines[product.id] ?? emptyLine();
                    const landing = lineLandingPrice(
                      product,
                      line,
                      perPacketInvoiceDiscount
                    );
                    const canEnter =
                      hasBoxPackaging(product) &&
                      getPacketsPerBox(product) != null;
                    const disabled = !headerReady || pending || !canEnter;

                    return (
                      <TableRow key={product.id} className="group">
                        <TableCell className="sticky left-0 z-[1] w-40 min-w-40 max-w-40 whitespace-normal bg-card font-medium align-top group-hover:bg-muted/50">
                          {product.name}
                        </TableCell>
                        <TableCell className="sticky left-40 z-[1] w-32 min-w-32 max-w-32 whitespace-normal border-r bg-card align-top text-sm text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)] group-hover:bg-muted/50">
                          {formatPackSizes(product)}
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
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
                        <TableCell className="align-top">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
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
                        <TableCell className="align-top">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
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
                        <TableCell className="align-top">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
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
                        <TableCell className="align-top">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
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
                        <TableCell className="align-top text-sm text-muted-foreground">
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

          <div className="flex flex-col items-end gap-3">
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="additionalDiscount">Additional discount (if any)</Label>
              <Input
                id="additionalDiscount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                disabled={!headerReady || pending || filledCount === 0}
                value={additionalDiscount}
                onChange={(e) => setAdditionalDiscount(e.target.value)}
                placeholder="0.00"
              />
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
                {pending ? "Saving…" : "Save receipt"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
