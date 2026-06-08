import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { IST_TIMEZONE } from "@/lib/timezone";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value?: string): value is string {
  return Boolean(value && DATE_RE.test(value));
}

export function parseIstDate(value: string) {
  return fromZonedTime(`${value} 12:00:00`, IST_TIMEZONE);
}

export function toIstDateString(date: Date) {
  return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Map between yyyy-MM-dd strings and react-day-picker dates without timezone
 * shifts. The string is the calendar day the user sees and selects; converting
 * through IST on a local-midnight Date moves the day for non-IST browsers.
 */
export function calendarDateFromIstString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function istDateStringFromCalendarDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addIstDays(value: string, days: number) {
  return toIstDateString(addDays(parseIstDate(value), days));
}

export function istDaySpan(start: string, end: string) {
  const diff =
    (parseIstDate(end).getTime() - parseIstDate(start).getTime()) /
    (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(diff) + 1);
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
