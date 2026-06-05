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
