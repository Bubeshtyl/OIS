export const REPORT_TYPES = [
  "stock-summary",
  "stock-movement",
  "consumption",
  "variance",
  "issued-managers",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  "stock-summary": "Stock Summary Report",
  "stock-movement": "Stock Movement Report",
  consumption: "Consumption Report",
  variance: "Variance Report",
  "issued-managers": "Issued to Managers Report",
};

export function isReportType(value?: string): value is ReportType {
  return Boolean(value && REPORT_TYPES.includes(value as ReportType));
}

export function defaultReportForRole(role: string): ReportType {
  return role === "ACCOUNTS" ? "consumption" : "stock-summary";
}
