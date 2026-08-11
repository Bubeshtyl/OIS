import { amountsWithinTolerance } from "@/lib/ms-hsd/totals";

export type BpclLineAmounts = {
  taxableValue: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
};

export function sumLineCgst(lines: BpclLineAmounts[]): number {
  return lines.reduce((sum, line) => sum + line.cgstAmount, 0);
}

export function sumLineSgst(lines: BpclLineAmounts[]): number {
  return lines.reduce((sum, line) => sum + line.sgstAmount, 0);
}

/** Line nets before invoice-level additional discount + rounding. */
export function sumLineNets(lines: BpclLineAmounts[]): number {
  return lines.reduce(
    (sum, line) =>
      sum +
      line.taxableValue -
      line.discountAmount +
      line.cgstAmount +
      line.sgstAmount,
    0
  );
}

export function computeExpectedTotalAmount(
  lines: BpclLineAmounts[],
  additionalDiscount: number,
  roundingOff: number
): number {
  return sumLineNets(lines) - additionalDiscount + roundingOff;
}

export function validateBpclInvoiceTotals({
  lines,
  additionalDiscount,
  totalCgst,
  totalSgst,
  roundingOff,
  totalAmount,
}: {
  lines: BpclLineAmounts[];
  additionalDiscount: number;
  totalCgst: number;
  totalSgst: number;
  roundingOff: number;
  totalAmount: number;
}): { ok: true } | { ok: false; error: string } {
  const cgstSum = sumLineCgst(lines);
  if (!amountsWithinTolerance(cgstSum, totalCgst)) {
    return {
      ok: false,
      error: `Total CGST (${totalCgst.toFixed(2)}) must equal line CGST (${cgstSum.toFixed(2)}).`,
    };
  }

  const sgstSum = sumLineSgst(lines);
  if (!amountsWithinTolerance(sgstSum, totalSgst)) {
    return {
      ok: false,
      error: `Total SGST (${totalSgst.toFixed(2)}) must equal line SGST (${sgstSum.toFixed(2)}).`,
    };
  }

  const expectedTotal = computeExpectedTotalAmount(
    lines,
    additionalDiscount,
    roundingOff
  );
  if (!amountsWithinTolerance(expectedTotal, totalAmount)) {
    return {
      ok: false,
      error: `Total amount (${totalAmount.toFixed(2)}) does not match taxable − discounts + taxes + rounding (${expectedTotal.toFixed(2)}).`,
    };
  }

  if (!(totalAmount > 0)) {
    return { ok: false, error: "Total amount is required." };
  }

  return { ok: true };
}
