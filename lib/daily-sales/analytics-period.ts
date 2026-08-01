import {
  addHours,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfHour,
  startOfWeek,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { parseIstDate } from "@/lib/date-range";
import { IST_TIMEZONE } from "@/lib/timezone";

export const ANALYTICS_METRICS = [
  "footfall",
  "footfall-by-price",
  "sales",
] as const;
export type AnalyticsMetric = (typeof ANALYTICS_METRICS)[number];

export const ANALYTICS_GRANULARITIES = [
  "hour",
  "day",
  "week",
  "month",
  "year",
] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function parseAnalyticsMetric(value?: string): AnalyticsMetric {
  if (value && (ANALYTICS_METRICS as readonly string[]).includes(value)) {
    return value as AnalyticsMetric;
  }
  return "footfall";
}

export function parseAnalyticsGranularity(
  value?: string
): AnalyticsGranularity {
  if (value && (ANALYTICS_GRANULARITIES as readonly string[]).includes(value)) {
    return value as AnalyticsGranularity;
  }
  return "day";
}

function parseWallDateTime(value: string): Date {
  const normalized = DATETIME_RE.test(value)
    ? `${value.slice(0, 10)} ${value.slice(11)}:00`
    : `${value} 00:00:00`;
  return fromZonedTime(normalized, IST_TIMEZONE);
}

function formatBucketKey(date: Date, granularity: AnalyticsGranularity): string {
  switch (granularity) {
    case "hour":
      return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd'T'HH:00");
    case "day":
    case "week":
      return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd");
    case "month":
      return formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM");
    case "year":
      return formatInTimeZone(date, IST_TIMEZONE, "yyyy");
  }
}

function alignBucketStart(
  date: Date,
  granularity: AnalyticsGranularity
): Date {
  switch (granularity) {
    case "hour":
      return startOfHour(date);
    case "day":
      return parseIstDate(formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd"));
    case "week":
      return startOfWeek(
        parseIstDate(formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd")),
        { weekStartsOn: 1 }
      );
    case "month":
      return startOfMonth(
        parseIstDate(formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd"))
      );
    case "year":
      return startOfYear(
        parseIstDate(formatInTimeZone(date, IST_TIMEZONE, "yyyy-MM-dd"))
      );
  }
}

function stepBucket(date: Date, granularity: AnalyticsGranularity): Date {
  switch (granularity) {
    case "hour":
      return addHours(date, 1);
    case "day":
      return addDays(date, 1);
    case "week":
      return addWeeks(date, 1);
    case "month":
      return addMonths(date, 1);
    case "year":
      return addYears(date, 1);
  }
}

/** Inclusive bucket keys from start..end matching Postgres date_trunc for IST wall times. */
export function enumeratePeriodBuckets(
  startDateTime: string,
  endDateTime: string,
  granularity: AnalyticsGranularity
): string[] {
  const start = parseWallDateTime(startDateTime);
  const end = parseWallDateTime(endDateTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const from = start <= end ? start : end;
  const to = start <= end ? end : start;

  let cursor = alignBucketStart(from, granularity);
  const endKey = formatBucketKey(alignBucketStart(to, granularity), granularity);
  const keys: string[] = [];

  const maxBuckets =
    granularity === "hour"
      ? 24 * 366
      : granularity === "day"
        ? 366 * 3
        : 500;

  while (keys.length < maxBuckets) {
    const key = formatBucketKey(cursor, granularity);
    keys.push(key);
    if (key >= endKey) break;
    cursor = stepBucket(cursor, granularity);
  }

  return keys;
}

export function labelPeriodBucket(
  key: string,
  granularity: AnalyticsGranularity,
  bucketCount: number
): string {
  switch (granularity) {
    case "hour": {
      const date = parseWallDateTime(key);
      return formatInTimeZone(date, IST_TIMEZONE, "d MMM, h a");
    }
    case "day": {
      const date = parseIstDate(key);
      return bucketCount <= 7
        ? date.toLocaleDateString("en-IN", {
            weekday: "short",
            timeZone: IST_TIMEZONE,
          })
        : date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: IST_TIMEZONE,
          });
    }
    case "week": {
      const date = parseIstDate(key);
      return `Week of ${date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        timeZone: IST_TIMEZONE,
      })}`;
    }
    case "month": {
      const date = parseIstDate(`${key}-01`);
      return date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
        timeZone: IST_TIMEZONE,
      });
    }
    case "year":
      return key;
  }
}
