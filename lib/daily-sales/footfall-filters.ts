const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export const DEFAULT_FOOTFALL_START_TIME = "08:00";
export const DEFAULT_FOOTFALL_END_TIME = "20:00";

export type FootfallFilterBounds = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  startHour: number;
  endHour: number;
  product?: string;
};

function parseHour(time: string): number {
  return Number(time.slice(0, 2));
}

export function parseTimeParam(
  value: string | undefined,
  fallback: string
): string {
  if (value && TIME_RE.test(value)) return value;
  return fallback;
}

export function parseDateParam(value: string | undefined): string | undefined {
  if (value && DATE_RE.test(value)) return value;
  return undefined;
}

export function normalizeDateBounds(startDate: string, endDate: string) {
  if (startDate <= endDate) return { startDate, endDate };
  return { startDate: endDate, endDate: startDate };
}

/** Valid same-day time window with inclusive hour range for the chart/query. */
export function parseFootfallFilterBounds(input: {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  product?: string;
}): FootfallFilterBounds | null {
  const startDate = parseDateParam(input.startDate);
  const endDate = parseDateParam(input.endDate);
  if (!startDate || !endDate) return null;

  const startTime = parseTimeParam(
    input.startTime,
    DEFAULT_FOOTFALL_START_TIME
  );
  const endTime = parseTimeParam(input.endTime, DEFAULT_FOOTFALL_END_TIME);
  if (startTime > endTime) return null;

  const { startDate: from, endDate: to } = normalizeDateBounds(
    startDate,
    endDate
  );
  const product = input.product?.trim() || undefined;

  return {
    startDate: from,
    endDate: to,
    startTime,
    endTime,
    startHour: parseHour(startTime),
    endHour: parseHour(endTime),
    product,
  };
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

export function formatPumpLabel(bayNo: number | null): string {
  if (bayNo == null) return "Unknown";
  return `Pump ${bayNo}`;
}

export const MAX_AMOUNT_RANGES = 10;

export type AmountRange = {
  min: number;
  max: number;
};

const AMOUNT_RANGE_PAIR_RE = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/;

function formatRangeNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(value)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}

export function formatAmountRangeLabel(range: AmountRange): string {
  return `${formatRangeNumber(range.min)}–${formatRangeNumber(range.max)}`;
}

export function serializeAmountRanges(ranges: AmountRange[]): string {
  return ranges
    .map((range) => `${formatRangeNumber(range.min)}-${formatRangeNumber(range.max)}`)
    .join(",");
}

/** Parse `10-12,12-15,35-50.6` into validated ranges (min < max), max 10. */
export function parseAmountRangesParam(
  value: string | undefined
): AmountRange[] {
  if (!value?.trim()) return [];

  const ranges: AmountRange[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const match = AMOUNT_RANGE_PAIR_RE.exec(trimmed);
    if (!match) continue;
    const min = Number(match[1]);
    const max = Number(match[2]);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) continue;
    ranges.push({ min, max });
    if (ranges.length >= MAX_AMOUNT_RANGES) break;
  }
  return ranges;
}

export type FootfallByPriceBounds = {
  startDate: string;
  endDate: string;
  ranges: AmountRange[];
  product?: string;
};

export function parseFootfallByPriceBounds(input: {
  startDate?: string;
  endDate?: string;
  ranges?: string;
  product?: string;
}): FootfallByPriceBounds | null {
  const startDate = parseDateParam(input.startDate);
  const endDate = parseDateParam(input.endDate);
  const ranges = parseAmountRangesParam(input.ranges);
  if (!startDate || !endDate || ranges.length === 0) return null;

  const { startDate: from, endDate: to } = normalizeDateBounds(
    startDate,
    endDate
  );

  return {
    startDate: from,
    endDate: to,
    ranges,
    product: input.product?.trim() || undefined,
  };
}
