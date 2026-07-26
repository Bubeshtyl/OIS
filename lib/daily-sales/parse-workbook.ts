import { parse } from "date-fns";
import * as XLSX from "xlsx";

export const REQUIRED_HEADERS = [
  "Receipt No",
  "Start Date",
  "End Date",
  "Product",
  "Amount (Rs.)",
  "Volume(Ltr.)",
  "Rate/Ltr (Rs.)",
  "MOP Type",
  "DSM Name",
  "Bay No",
  "Nozzle No",
  "Start Tot",
  "End Tot",
  "Discount (Rs.)",
  "Net Amount (Rs.)",
  "Vehicle No",
  "Vehicle Segment",
  "Mobile No",
] as const;

const DATE_FORMAT = "dd-MM-yyyy HH:mm:ss";

export type DailySalesRow = {
  receiptNo: string;
  startDate: Date;
  endDate: Date;
  product: string;
  amount: string;
  volumeLitre: string;
  ratePerLtr: string;
  mopType: string;
  dsmName: string;
  bayNo: number | null;
  nozzleNo: number | null;
  startTot: string;
  endTot: string;
  discountAmount: string;
  netAmount: string;
  vehicleNo: string | null;
  vehicleSegment: string | null;
  mobileNo: string | null;
};

export type ParseWorkbookResult = {
  rows: DailySalesRow[];
  /** Rows skipped because Receipt No was missing/invalid. */
  skipped: number;
  /** Duplicate receipt numbers collapsed (last wins). */
  duplicatesCollapsed: number;
};

export class DailySalesParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailySalesParseError";
  }
}

function cellToString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Avoid scientific notation for receipt / mobile style numbers.
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return String(value).trim() || null;
}

function cellToNumericString(value: unknown, field: string): string {
  if (value == null || value === "") {
    throw new DailySalesParseError(`Missing numeric value for ${field}`);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new DailySalesParseError(`Invalid numeric value for ${field}`);
    }
    return String(value);
  }
  const cleaned = String(value).trim().replace(/,/g, "");
  if (cleaned === "" || Number.isNaN(Number(cleaned))) {
    throw new DailySalesParseError(`Invalid numeric value for ${field}: ${value}`);
  }
  return cleaned;
}

function cellToOptionalInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const cleaned = String(value).trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parsePumpDate(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date — store wall-clock as UTC components for timestamp-without-tz.
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      throw new DailySalesParseError(`Invalid date for ${field}`);
    }
    return new Date(
      Date.UTC(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        parsed.H,
        parsed.M,
        Math.floor(parsed.S)
      )
    );
  }
  const text = cellToString(value);
  if (!text) {
    throw new DailySalesParseError(`Missing date for ${field}`);
  }
  const parsed = parse(text, DATE_FORMAT, new Date());
  if (Number.isNaN(parsed.getTime())) {
    throw new DailySalesParseError(
      `Invalid date for ${field}: expected ${DATE_FORMAT}, got "${text}"`
    );
  }
  // Preserve wall-clock time in timestamp-without-tz columns (no local offset shift).
  return new Date(
    Date.UTC(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      parsed.getSeconds()
    )
  );
}

function mapRow(
  raw: Record<string, unknown>,
  rowIndex: number
): DailySalesRow | null {
  const receiptNo = cellToString(raw["Receipt No"]);
  if (!receiptNo) return null;

  try {
    return {
      receiptNo,
      startDate: parsePumpDate(raw["Start Date"], "Start Date"),
      endDate: parsePumpDate(raw["End Date"], "End Date"),
      product: cellToString(raw["Product"]) ?? "",
      amount: cellToNumericString(raw["Amount (Rs.)"], "Amount (Rs.)"),
      volumeLitre: cellToNumericString(raw["Volume(Ltr.)"], "Volume(Ltr.)"),
      ratePerLtr: cellToNumericString(raw["Rate/Ltr (Rs.)"], "Rate/Ltr (Rs.)"),
      mopType: cellToString(raw["MOP Type"]) ?? "",
      dsmName: cellToString(raw["DSM Name"]) ?? "",
      bayNo: cellToOptionalInt(raw["Bay No"]),
      nozzleNo: cellToOptionalInt(raw["Nozzle No"]),
      startTot: cellToNumericString(raw["Start Tot"], "Start Tot"),
      endTot: cellToNumericString(raw["End Tot"], "End Tot"),
      discountAmount:
        raw["Discount (Rs.)"] == null || raw["Discount (Rs.)"] === ""
          ? "0"
          : cellToNumericString(raw["Discount (Rs.)"], "Discount (Rs.)"),
      netAmount: cellToNumericString(raw["Net Amount (Rs.)"], "Net Amount (Rs.)"),
      vehicleNo: cellToString(raw["Vehicle No"]),
      vehicleSegment: cellToString(raw["Vehicle Segment"]),
      mobileNo: cellToString(raw["Mobile No"]),
    };
  } catch (error) {
    if (error instanceof DailySalesParseError) {
      throw new DailySalesParseError(`Row ${rowIndex}: ${error.message}`);
    }
    throw error;
  }
}

function isCsvFileName(fileName?: string) {
  return (fileName ?? "").toLowerCase().endsWith(".csv");
}

function readWorkbook(buffer: ArrayBuffer, fileName?: string): XLSX.WorkBook {
  if (isCsvFileName(fileName)) {
    // Strip UTF-8 BOM so the first header matches expected column names.
    const text = new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
    if (!text.trim()) {
      throw new DailySalesParseError("CSV file is empty");
    }
    return XLSX.read(text, {
      type: "string",
      raw: true,
    });
  }

  return XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    raw: true,
  });
}

export function parseDailySalesWorkbook(
  buffer: ArrayBuffer,
  fileName?: string
): ParseWorkbookResult {
  const workbook = readWorkbook(buffer, fileName);
  const sourceLabel = isCsvFileName(fileName) ? "CSV" : "Sheet";

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new DailySalesParseError(
      isCsvFileName(fileName) ? "CSV has no data" : "Workbook has no sheets"
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (matrix.length === 0) {
    throw new DailySalesParseError(`${sourceLabel} is empty`);
  }

  const headerRow = (matrix[0] ?? []).map((cell) =>
    cell == null ? "" : String(cell).trim()
  );

  const missing = REQUIRED_HEADERS.filter((h) => !headerRow.includes(h));
  if (missing.length > 0) {
    throw new DailySalesParseError(
      `Missing required columns: ${missing.join(", ")}`
    );
  }

  const objects = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });

  if (objects.length === 0) {
    throw new DailySalesParseError(`${sourceLabel} has no data rows`);
  }

  const byReceipt = new Map<string, DailySalesRow>();
  let skipped = 0;
  let seen = 0;

  for (let i = 0; i < objects.length; i++) {
    const mapped = mapRow(objects[i], i + 2);
    if (!mapped) {
      skipped += 1;
      continue;
    }
    seen += 1;
    byReceipt.set(mapped.receiptNo, mapped);
  }

  if (byReceipt.size === 0) {
    throw new DailySalesParseError("No valid rows with a Receipt No");
  }

  return {
    rows: Array.from(byReceipt.values()),
    skipped,
    duplicatesCollapsed: seen - byReceipt.size,
  };
}
