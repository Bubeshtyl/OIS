import * as XLSX from "xlsx";
import { formatRangeLabel } from "@/lib/date-range";
import { formatDateTime } from "@/lib/format";
import { ledgerRowPackets } from "@/lib/transactions/quantity";
import type { loadAllReportsData } from "@/lib/reports/load-all-reports";

export const EXPORT_SHEET_NAMES = {
  stockSummary: "Stock Summary",
  stockMovement: "Stock Movement",
  consumption: "Consumption",
  variance: "Variance",
  issuedManagers: "Issued to Managers",
} as const;

type ReportsData = Awaited<ReturnType<typeof loadAllReportsData>>;

type LedgerRow = ReportsData["ledger"][number];

function metadataRows(startDate: string, endDate: string, generatedAt: Date) {
  return [
    ["Date range", formatRangeLabel(startDate, endDate)],
    ["Generated", generatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
    [],
  ];
}

function buildStockSummarySheet(
  data: ReportsData["stockSummary"],
  startDate: string,
  endDate: string,
  generatedAt: Date
) {
  const headers = [
    "Oil Type",
    "Opening (pkt)",
    "Opening (L)",
    "Received (pkt)",
    "Received (L)",
    "Issued (pkt)",
    "Issued (L)",
    "Returned (pkt)",
    "Returned (L)",
    "Sold (pkt)",
    "Sold (L)",
    "Damaged (pkt)",
    "Damaged (L)",
    "Balance (pkt)",
    "Balance (L)",
  ];

  const body = data.rows.map((row) => [
    row.name,
    row.openingPackets,
    row.opening,
    row.receivedPackets,
    row.received,
    row.issuedPackets,
    row.issued,
    row.returnedPackets,
    row.returned,
    row.soldPackets,
    row.sold,
    row.damagedPackets,
    row.damaged,
    row.balancePackets,
    row.balance,
  ]);

  body.push([
    "Total",
    data.totals.openingPackets,
    data.totals.opening,
    data.totals.receivedPackets,
    data.totals.received,
    data.totals.issuedPackets,
    data.totals.issued,
    data.totals.returnedPackets,
    data.totals.returned,
    data.totals.soldPackets,
    data.totals.sold,
    data.totals.damagedPackets,
    data.totals.damaged,
    data.totals.balancePackets,
    data.totals.balance,
  ]);

  return XLSX.utils.aoa_to_sheet([
    ...metadataRows(startDate, endDate, generatedAt),
    headers,
    ...body,
  ]);
}

function buildVarianceSheet(
  data: ReportsData["variance"],
  startDate: string,
  endDate: string,
  generatedAt: Date
) {
  const headers = [
    "Oil Type",
    "Opening (pkt)",
    "Opening (L)",
    "Received (pkt)",
    "Received (L)",
    "Issued (pkt)",
    "Issued (L)",
    "Returned (pkt)",
    "Returned (L)",
    "Damaged (pkt)",
    "Damaged (L)",
    "Depot Balance (pkt)",
    "Depot Balance (L)",
    "Variance (pkt)",
    "Variance (L)",
  ];

  const body = data.rows.map((row) => [
    row.name,
    row.openingPackets,
    row.opening,
    row.receivedPackets,
    row.received,
    row.issuedPackets,
    row.issued,
    row.returnedPackets,
    row.returned,
    row.damagedPackets,
    row.damaged,
    row.depotBalancePackets,
    row.depotBalance,
    row.variancePackets,
    row.variance,
  ]);

  body.push([
    "Total",
    data.totals.openingPackets,
    data.totals.opening,
    data.totals.receivedPackets,
    data.totals.received,
    data.totals.issuedPackets,
    data.totals.issued,
    data.totals.returnedPackets,
    data.totals.returned,
    data.totals.damagedPackets,
    data.totals.damaged,
    data.totals.depotBalancePackets,
    data.totals.depotBalance,
    data.totals.variancePackets,
    data.totals.variance,
  ]);

  return XLSX.utils.aoa_to_sheet([
    ...metadataRows(startDate, endDate, generatedAt),
    headers,
    ...body,
  ]);
}

function ledgerRowValues(row: LedgerRow) {
  return [
    formatDateTime(row.createdAt),
    row.type,
    row.productName,
    ledgerRowPackets(row),
    Number(row.quantity),
    row.fromLocation ?? "",
    row.toLocation ?? "",
    row.referenceNote ?? "",
  ];
}

function buildLedgerSheet(
  rows: LedgerRow[],
  startDate: string,
  endDate: string,
  generatedAt: Date
) {
  const headers = [
    "Recorded",
    "Type",
    "Product",
    "Qty (pkt)",
    "Qty (L)",
    "From",
    "To",
    "Note",
  ];

  return XLSX.utils.aoa_to_sheet([
    ...metadataRows(startDate, endDate, generatedAt),
    headers,
    ...rows.map(ledgerRowValues),
  ]);
}

export function buildReportsWorkbook(
  data: ReportsData,
  startDate: string,
  endDate: string,
  generatedAt: Date = new Date()
) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    buildStockSummarySheet(data.stockSummary, startDate, endDate, generatedAt),
    EXPORT_SHEET_NAMES.stockSummary
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildLedgerSheet(data.ledger, startDate, endDate, generatedAt),
    EXPORT_SHEET_NAMES.stockMovement
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildLedgerSheet(data.consumption, startDate, endDate, generatedAt),
    EXPORT_SHEET_NAMES.consumption
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildVarianceSheet(data.variance, startDate, endDate, generatedAt),
    EXPORT_SHEET_NAMES.variance
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildLedgerSheet(data.issued, startDate, endDate, generatedAt),
    EXPORT_SHEET_NAMES.issuedManagers
  );

  return workbook;
}

export function workbookToBuffer(workbook: XLSX.WorkBook) {
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
