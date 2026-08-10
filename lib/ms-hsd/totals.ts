/** Paisa-level tolerance for invoice total checks. */
export const TOTAL_TOLERANCE = 0.02;

export type MsHsdLineAmounts = {
  totalValue: number;
  dlyTaxableCharge: number;
  vatLstAmount: number;
  additionalVat: number;
};

export function sumLineTaxes(lines: MsHsdLineAmounts[]): number {
  return lines.reduce(
    (sum, line) => sum + line.vatLstAmount + line.additionalVat,
    0
  );
}

export function computeExpectedTotalAmount(
  lines: MsHsdLineAmounts[],
  roundingOff: number
): number {
  const linesTotal = lines.reduce(
    (sum, line) =>
      sum +
      line.totalValue +
      line.dlyTaxableCharge +
      line.vatLstAmount +
      line.additionalVat,
    0
  );
  return linesTotal + roundingOff;
}

export function amountsWithinTolerance(
  expected: number,
  actual: number,
  tolerance = TOTAL_TOLERANCE
): boolean {
  return Math.abs(expected - actual) <= tolerance;
}

export function validateInvoiceTotals({
  lines,
  vatStaxCessTotal,
  roundingOff,
  totalAmount,
}: {
  lines: MsHsdLineAmounts[];
  vatStaxCessTotal: number;
  roundingOff: number;
  totalAmount: number;
}): { ok: true } | { ok: false; error: string } {
  const taxSum = sumLineTaxes(lines);
  if (!amountsWithinTolerance(taxSum, vatStaxCessTotal)) {
    return {
      ok: false,
      error: `VAT/STAX/CESS total (${vatStaxCessTotal.toFixed(2)}) must equal line VAT + Additional VAT (${taxSum.toFixed(2)}).`,
    };
  }

  const expectedTotal = computeExpectedTotalAmount(lines, roundingOff);
  if (!amountsWithinTolerance(expectedTotal, totalAmount)) {
    return {
      ok: false,
      error: `Total amount (${totalAmount.toFixed(2)}) does not match line values + taxes + rounding (${expectedTotal.toFixed(2)}).`,
    };
  }

  return { ok: true };
}
