"use client";

import { LedgerTable } from "@/components/reports/ledger-table";
import { ReportControls } from "@/components/reports/report-controls";
import { ReportPreview } from "@/components/reports/report-preview";
import { ReportTypeList } from "@/components/reports/report-type-list";
import { StockSummaryTable } from "@/components/reports/stock-summary-table";
import { VarianceTable } from "@/components/reports/variance-table";
import { PageHeader } from "@/components/shared/page-blocks";
import { StockUnitToggle } from "@/components/shared/stock-unit-toggle";
import { useStockDisplayUnit } from "@/components/shared/use-stock-display-unit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StockDisplayUnit } from "@/lib/format";
import type {
  StockSummaryReportRow,
  VarianceReportRow,
} from "@/lib/queries/reports";
import {
  REPORT_LABELS,
  type ReportType,
} from "@/lib/reports/config";

type LedgerRow = {
  id: string;
  type: "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL";
  productName: string;
  unit: string;
  quantity: string;
  transactionDate: string;
  referenceNote?: string | null;
  reversesTransactionId?: string | null;
  packetsPerBox?: string | null;
  volumePerPacket?: string | null;
};

export function ReportsView({
  report,
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
  generatedAt,
  stockSummary,
  variance,
  ledger,
  reversedIds,
  isAdmin,
  unit: initialUnit = "packets",
}: {
  report: ReportType;
  startDate: string;
  endDate: string;
  defaultStart: string;
  defaultEnd: string;
  generatedAt: Date;
  stockSummary: {
    rows: StockSummaryReportRow[];
    totals: {
      opening: number;
      received: number;
      issued: number;
      consumption: number;
      balance: number;
      openingPackets: number;
      receivedPackets: number;
      issuedPackets: number;
      consumptionPackets: number;
      balancePackets: number;
    };
  } | null;
  variance: {
    rows: VarianceReportRow[];
    totals: {
      received: number;
      issued: number;
      depotBalance: number;
      variance: number;
      receivedPackets: number;
      issuedPackets: number;
      depotBalancePackets: number;
      variancePackets: number;
    };
  } | null;
  ledger: LedgerRow[];
  reversedIds: string[];
  isAdmin: boolean;
  unit?: StockDisplayUnit;
}) {
  const { unit: displayUnit, setDisplayUnit } = useStockDisplayUnit(initialUnit);
  const reversedSet = new Set(reversedIds);
  const title = REPORT_LABELS[report];

  const consumptionRows = ledger.filter((r) => r.type === "SALE");
  const issuedRows = ledger.filter((r) => r.type === "TRANSFER");

  function renderPreview() {
    switch (report) {
      case "stock-summary":
        return stockSummary ? (
          <StockSummaryTable
            rows={stockSummary.rows}
            totals={stockSummary.totals}
            unit={displayUnit}
          />
        ) : null;
      case "variance":
        return variance ? (
          <VarianceTable
            rows={variance.rows}
            totals={variance.totals}
            unit={displayUnit}
          />
        ) : null;
      case "stock-movement":
        return (
          <LedgerTable
            rows={ledger}
            reversedIds={reversedSet}
            isAdmin={isAdmin}
            unit={displayUnit}
          />
        );
      case "consumption":
        return (
          <LedgerTable
            rows={consumptionRows}
            reversedIds={reversedSet}
            isAdmin={false}
            unit={displayUnit}
          />
        );
      case "issued-managers":
        return (
          <LedgerTable
            rows={issuedRows}
            reversedIds={reversedSet}
            isAdmin={false}
            unit={displayUnit}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Generate and export inventory reports"
      />

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <Card className="h-fit border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Report Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 pb-4">
            <ReportTypeList activeReport={report} />
            <ReportControls
              report={report}
              startDate={startDate}
              endDate={endDate}
              defaultStart={defaultStart}
              defaultEnd={defaultEnd}
            />
          </CardContent>
        </Card>

        <ReportPreview
          title={title}
          generatedAt={generatedAt}
          unitToggle={
            <StockUnitToggle unit={displayUnit} onChange={setDisplayUnit} />
          }
        >
          {renderPreview()}
        </ReportPreview>
      </div>
    </div>
  );
}
