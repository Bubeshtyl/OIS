export const VEHICLE_SEGMENT_OPTIONS = [
  { value: "all", label: "All" },
  { value: "2W", label: "2W", dbValue: "Two Wheeler" },
  { value: "3W", label: "3W", dbValue: "Three Wheeler" },
  { value: "4W", label: "4W", dbValue: "Four Wheeler" },
  { value: "LCV", label: "LCV", dbValue: "LCV" },
  { value: "HCV", label: "HCV", dbValue: "HCV" },
] as const;

export type VehicleSegmentFilter =
  (typeof VEHICLE_SEGMENT_OPTIONS)[number]["value"];

export type DailySalesFilters = {
  /** Set when the user clicks Apply — required before data is fetched. */
  applied: boolean;
  start?: string;
  end?: string;
  receiptFrom?: string;
  receiptTo?: string;
  product?: string;
  mopType?: string;
  amountMin?: string;
  amountMax?: string;
  volumeMin?: string;
  volumeMax?: string;
  vehicleSegment: VehicleSegmentFilter;
  vehicleOrMobile?: string;
};

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function optionalString(value: string | null | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumberString(value: string | null | undefined) {
  const trimmed = optionalString(value);
  if (!trimmed) return undefined;
  if (Number.isNaN(Number(trimmed))) return undefined;
  return trimmed;
}

function parseVehicleSegment(value: string | null | undefined): VehicleSegmentFilter {
  if (
    value === "2W" ||
    value === "3W" ||
    value === "4W" ||
    value === "LCV" ||
    value === "HCV"
  ) {
    return value;
  }
  return "all";
}

export function parseDailySalesFilters(
  params: Record<string, string | undefined>
): DailySalesFilters {
  const start = optionalString(params.start);
  const end = optionalString(params.end);

  return {
    applied: params.applied === "1",
    start: start && DATETIME_RE.test(start) ? start : undefined,
    end: end && DATETIME_RE.test(end) ? end : undefined,
    receiptFrom: optionalString(params.receiptFrom),
    receiptTo: optionalString(params.receiptTo),
    product: optionalString(params.product),
    mopType: optionalString(params.mopType),
    amountMin: optionalNumberString(params.amountMin),
    amountMax: optionalNumberString(params.amountMax),
    volumeMin: optionalNumberString(params.volumeMin),
    volumeMax: optionalNumberString(params.volumeMax),
    vehicleSegment: parseVehicleSegment(params.vehicleSegment),
    vehicleOrMobile: optionalString(params.q),
  };
}

export function dailySalesFiltersToSearchParams(
  filters: DailySalesFilters
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.applied) params.set("applied", "1");
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.receiptFrom) params.set("receiptFrom", filters.receiptFrom);
  if (filters.receiptTo) params.set("receiptTo", filters.receiptTo);
  if (filters.product) params.set("product", filters.product);
  if (filters.mopType) params.set("mopType", filters.mopType);
  if (filters.amountMin) params.set("amountMin", filters.amountMin);
  if (filters.amountMax) params.set("amountMax", filters.amountMax);
  if (filters.volumeMin) params.set("volumeMin", filters.volumeMin);
  if (filters.volumeMax) params.set("volumeMax", filters.volumeMax);
  if (filters.vehicleSegment !== "all") {
    params.set("vehicleSegment", filters.vehicleSegment);
  }
  if (filters.vehicleOrMobile) params.set("q", filters.vehicleOrMobile);
  return params;
}

export function vehicleSegmentDbValue(
  segment: VehicleSegmentFilter
): string | undefined {
  if (segment === "all") return undefined;
  const match = VEHICLE_SEGMENT_OPTIONS.find((opt) => opt.value === segment);
  return match && "dbValue" in match ? match.dbValue : undefined;
}

/**
 * Convert `yyyy-MM-ddTHH:mm` to a Postgres `timestamp without time zone` literal.
 * Avoids JS Date timezone shifts against timestamp-without-tz columns.
 */
export function wallDateTimeToTimestamp(value: string, bound: "start" | "end" = "start") {
  const [datePart, timePart = "00:00"] = value.split("T");
  const seconds = bound === "end" ? "59" : "00";
  return `${datePart} ${timePart}:${seconds}`;
}
