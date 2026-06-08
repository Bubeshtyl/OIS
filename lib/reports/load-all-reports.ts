import { getLedger } from "@/lib/queries/inventory";
import {
  getStockSummaryReport,
  getVarianceReport,
} from "@/lib/queries/reports";

export async function loadAllReportsData(startDate: string, endDate: string) {
  const [stockSummary, variance, ledger] = await Promise.all([
    getStockSummaryReport(startDate, endDate),
    getVarianceReport(startDate, endDate),
    getLedger({ startDate, endDate }),
  ]);

  return {
    stockSummary,
    variance,
    ledger,
    consumption: ledger.filter((row) =>
      ["SALE", "RETURNED", "DAMAGED"].includes(row.type)
    ),
    issued: ledger.filter((row) => row.type === "TRANSFER"),
  };
}
