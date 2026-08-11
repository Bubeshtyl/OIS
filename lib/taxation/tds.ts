/** TDS rates as decimal multipliers (0.1% = 0.001). */
export const TDS_RATE_MS_HSD = 0.001;
export const TDS_RATE_LFR = 0.002;
export const TDS_RATE_OIL = 0.001;

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTds(baseAmount: number, rate: number): number {
  if (!(baseAmount > 0) || !(rate > 0)) return 0;
  return roundMoney(baseAmount * rate);
}

export function computeMsHsdTds(baseAmount: number): number {
  return computeTds(baseAmount, TDS_RATE_MS_HSD);
}

export function computeLfrTds(taxableAmount: number): number {
  return computeTds(taxableAmount, TDS_RATE_LFR);
}

export function computeOilTds(baseAmount: number): number {
  return computeTds(baseAmount, TDS_RATE_OIL);
}

export function formatTdsRatePercent(rate: number): string {
  const pct = rate * 100;
  const rounded = Math.round(pct * 1000) / 1000;
  return `${rounded}%`;
}
