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

export const EXTRA_CONDITION_FIELDS = {
  ratePerLtr: {
    label: "Rate/Ltr",
    kind: "number",
    ops: ["eq", "gte", "lte"],
  },
  dsmName: {
    label: "DSM Name",
    kind: "text",
    ops: ["is", "contains"],
  },
  bayNo: {
    label: "Bay No",
    kind: "integer",
    ops: ["eq"],
  },
  nozzleNo: {
    label: "Nozzle No",
    kind: "integer",
    ops: ["eq"],
  },
  startTot: {
    label: "Start Tot",
    kind: "number",
    ops: ["eq", "gte", "lte"],
  },
  endTot: {
    label: "End Tot",
    kind: "number",
    ops: ["eq", "gte", "lte"],
  },
  discountAmount: {
    label: "Discount",
    kind: "number",
    ops: ["eq", "gte", "lte"],
  },
  netAmount: {
    label: "Net Amount",
    kind: "number",
    ops: ["eq", "gte", "lte"],
  },
} as const;

export type ExtraConditionField = keyof typeof EXTRA_CONDITION_FIELDS;

export type ExtraConditionOp =
  (typeof EXTRA_CONDITION_FIELDS)[ExtraConditionField]["ops"][number];

export type DailySalesCondition = {
  id: string;
  field: ExtraConditionField;
  op: ExtraConditionOp;
  value: string;
};

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
  conditions: DailySalesCondition[];
};

export const EXTRA_CONDITION_FIELD_OPTIONS = (
  Object.entries(EXTRA_CONDITION_FIELDS) as [
    ExtraConditionField,
    (typeof EXTRA_CONDITION_FIELDS)[ExtraConditionField],
  ][]
).map(([value, meta]) => ({
  value,
  label: meta.label,
  kind: meta.kind,
  ops: meta.ops,
}));

export const CONDITION_OP_LABELS: Record<string, string> = {
  eq: "=",
  gte: "≥",
  lte: "≤",
  is: "equal",
  contains: "contains",
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

function isExtraConditionField(value: unknown): value is ExtraConditionField {
  return typeof value === "string" && value in EXTRA_CONDITION_FIELDS;
}

function isOpForField(
  field: ExtraConditionField,
  op: unknown
): op is ExtraConditionOp {
  if (typeof op !== "string") return false;
  return (EXTRA_CONDITION_FIELDS[field].ops as readonly string[]).includes(op);
}

function validateConditionValue(
  field: ExtraConditionField,
  value: string
): string | undefined {
  const trimmed = optionalString(value);
  if (!trimmed) return undefined;

  const kind = EXTRA_CONDITION_FIELDS[field].kind;
  if (kind === "number" || kind === "integer") {
    if (Number.isNaN(Number(trimmed))) return undefined;
    if (kind === "integer" && !Number.isInteger(Number(trimmed))) return undefined;
    return trimmed;
  }
  return trimmed;
}

export function createEmptyCondition(
  field: ExtraConditionField = "dsmName"
): DailySalesCondition {
  const meta = EXTRA_CONDITION_FIELDS[field];
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    field,
    op: meta.ops[0],
    value: "",
  };
}

export function parseConditionsParam(
  raw: string | null | undefined
): DailySalesCondition[] {
  const text = optionalString(raw);
  if (!text) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const conditions: DailySalesCondition[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const field = record.field ?? record.f;
    const op = record.op ?? record.o;
    const value = record.value ?? record.v;
    const id =
      typeof record.id === "string" && record.id
        ? record.id
        : createEmptyCondition().id;

    if (!isExtraConditionField(field) || !isOpForField(field, op)) continue;
    if (typeof value !== "string") continue;

    const validated = validateConditionValue(field, value);
    // Keep rows that were applied with a value; drop empty/invalid on parse.
    if (!validated) continue;

    conditions.push({ id, field, op, value: validated });
  }

  return conditions;
}

export function serializeConditionsParam(
  conditions: DailySalesCondition[]
): string | undefined {
  const compact = conditions
    .map((condition) => {
      const value = validateConditionValue(condition.field, condition.value);
      if (!value) return null;
      if (!isOpForField(condition.field, condition.op)) return null;
      return {
        f: condition.field,
        o: condition.op,
        v: value,
      };
    })
    .filter((item): item is { f: ExtraConditionField; o: ExtraConditionOp; v: string } =>
      item != null
    );

  if (compact.length === 0) return undefined;
  return JSON.stringify(compact);
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
    conditions: parseConditionsParam(params.conds),
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
  const conds = serializeConditionsParam(filters.conditions ?? []);
  if (conds) params.set("conds", conds);
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
