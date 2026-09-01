import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const IST_TIMEZONE = "Asia/Kolkata";

export function getIstNow(): Date {
  return toZonedTime(new Date(), IST_TIMEZONE);
}

export function getIstTodayString(): string {
  return formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
}

export function getIstDateLabel(date = new Date()): string {
  return formatInTimeZone(date, IST_TIMEZONE, "EEE d MMM");
}

/** Browser timezone when available; IST fallback for SSR. */
export function getClientTimeZone(): string {
  if (typeof window !== "undefined") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return IST_TIMEZONE;
}

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a UTC/timestamptz value for display in the user's local timezone. */
export function formatClientDate(
  value: Date | string | number,
  pattern = "dd MMM yyyy"
): string {
  const date = toDate(value);
  if (!date) return "—";
  return formatInTimeZone(date, getClientTimeZone(), pattern);
}

export function formatClientDateTime(
  value: Date | string | number,
  pattern = "dd MMM yyyy, hh:mm a"
): string {
  const date = toDate(value);
  if (!date) return "—";
  return formatInTimeZone(date, getClientTimeZone(), pattern);
}
