import { formatInTimeZone } from "date-fns-tz";
import { IST_TIMEZONE } from "@/lib/timezone";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value?: string): value is string {
  return Boolean(value && DATE_RE.test(value));
}

export function parseIstDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function toIstDateString(date: Date) {
  return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");
}

export function defaultRangeEnd(today: string) {
  return today;
}

export function defaultRangeStart(today: string) {
  return `${today.slice(0, 8)}01`;
}

export function normalizeDateRange(start: string, end: string) {
  if (start <= end) {
    return { start, end };
  }
  return { start: end, end: start };
}

export function formatRangeLabel(start: string, end: string) {
  const startLabel = formatInTimeZone(
    parseIstDate(start),
    IST_TIMEZONE,
    "d MMM yyyy"
  );
  if (start === end) {
    return startLabel;
  }
  const endLabel = formatInTimeZone(
    parseIstDate(end),
    IST_TIMEZONE,
    "d MMM yyyy"
  );
  return `${startLabel} – ${endLabel}`;
}
