/** Paisa-level tolerance for invoice total checks. */
export const TOTAL_TOLERANCE = 0.02;

export function amountsWithinTolerance(
  expected: number,
  actual: number,
  tolerance = TOTAL_TOLERANCE
): boolean {
  return Math.abs(expected - actual) <= tolerance;
}

export function computeTaxAmount(taxableAmount: number, rate: number): number {
  if (taxableAmount <= 0 || rate <= 0) return 0;
  return Math.round(((taxableAmount * rate) / 100) * 100) / 100;
}

export function computeExpectedTotalAmount(
  taxableAmount: number,
  cgstAmount: number,
  sgstAmount: number
): number {
  return (
    Math.round((taxableAmount + cgstAmount + sgstAmount) * 100) / 100
  );
}

export function validateLfrInvoiceTotals({
  taxableAmount,
  cgstAmount,
  sgstAmount,
  totalAmount,
}: {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}): { ok: true } | { ok: false; error: string } {
  const expectedTotal = computeExpectedTotalAmount(
    taxableAmount,
    cgstAmount,
    sgstAmount
  );
  if (!amountsWithinTolerance(expectedTotal, totalAmount)) {
    return {
      ok: false,
      error: `Total amount (${totalAmount.toFixed(2)}) must equal taxable + CGST + SGST (${expectedTotal.toFixed(2)}).`,
    };
  }
  return { ok: true };
}
