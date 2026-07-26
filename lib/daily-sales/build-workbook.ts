import * as XLSX from "xlsx";
import type { DailySalesReportRow } from "@/lib/queries/daily-sales";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatWallDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad2(date.getUTCDate())}-${pad2(date.getUTCMonth() + 1)}-${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}

const HEADERS: string[] = [
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
];

export function buildDailySalesWorkbook(rows: DailySalesReportRow[]) {
  const workbook = XLSX.utils.book_new();
  const body: (string | number | null)[][] = rows.map((row) => [
    row.receiptNo,
    formatWallDateTime(row.startDate),
    formatWallDateTime(row.endDate),
    row.product,
    Number(row.amount),
    Number(row.volumeLitre),
    Number(row.ratePerLtr),
    row.mopType,
    row.dsmName,
    row.bayNo,
    row.nozzleNo,
    Number(row.startTot),
    Number(row.endTot),
    Number(row.discountAmount),
    Number(row.netAmount),
    row.vehicleNo,
    row.vehicleSegment,
    row.mobileNo,
  ]);

  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...body]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Daily Sales");
  return workbook;
}

export function dailySalesWorkbookToBuffer(workbook: XLSX.WorkBook) {
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
