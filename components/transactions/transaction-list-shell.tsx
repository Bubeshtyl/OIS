"use client";

import type { OilProduct } from "@/lib/db/schema";
import type {
  TransactionListRow,
  TransactionListSummary,
} from "@/lib/queries/transactions";
import type { TransactionPageKind } from "@/lib/transactions/page-config";
import { PAGE_CONFIG } from "@/lib/transactions/page-config";
import { buildFilterExtraParams } from "@/lib/transactions/url-params";
import type { StockDisplayUnit } from "@/lib/format";
import { useStockDisplayUnit } from "@/components/shared/use-stock-display-unit";
import { ConsumptionTransactionTable } from "@/components/transactions/consumption-transaction-table";
import { IssuedTransactionTable } from "@/components/transactions/issued-transaction-table";
import { NewTransactionDialog } from "@/components/transactions/new-transaction-dialog";
import { ReceiveTransactionTable } from "@/components/transactions/receive-transaction-table";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionPagination } from "@/components/transactions/transaction-pagination";
import { TransactionSummaryBar } from "@/components/transactions/transaction-summary-bar";
import { DateRangePicker } from "@/components/layout/date-range-picker";
import { PageHeader } from "@/components/shared/page-blocks";
import { Card, CardContent } from "@/components/ui/card";

export function TransactionListShell({
  pageKind,
  products,
  creators,
  rows,
  total,
  page,
  pageSize,
  summary,
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
  productId,
  recordedBy,
  search,
  isAdmin,
  reversedIds,
  unit: initialUnit = "packets",
}: {
  pageKind: TransactionPageKind;
  products: OilProduct[];
  creators: Array<{ id: string; name: string }>;
  rows: TransactionListRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: TransactionListSummary;
  startDate: string;
  endDate: string;
  defaultStart: string;
  defaultEnd: string;
  productId?: string;
  recordedBy?: string;
  search?: string;
  isAdmin: boolean;
  reversedIds: string[];
  unit?: StockDisplayUnit;
}) {
  const config = PAGE_CONFIG[pageKind];
  const { unit: displayUnit, setDisplayUnit } = useStockDisplayUnit(initialUnit);
  const extraParams = buildFilterExtraParams({
    product: productId,
    recordedBy,
    search,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader title={config.title} subtitle={config.subtitle} />
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            defaultStart={defaultStart}
            defaultEnd={defaultEnd}
            extraParams={extraParams}
            className="h-9 gap-2 bg-card shadow-sm"
          />
          <NewTransactionDialog
            pageKind={pageKind}
            products={products}
            buttonLabel={config.newButtonLabel}
          />
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <TransactionFilters
            pageKind={pageKind}
            products={products.map((p) => ({ id: p.id, name: p.name }))}
            creators={creators}
            productId={productId}
            recordedBy={recordedBy}
            search={search}
            unit={displayUnit}
            onUnitChange={setDisplayUnit}
          />

          <div className="overflow-x-auto rounded-lg border [scrollbar-gutter:stable]">
            {pageKind === "receive" && (
              <ReceiveTransactionTable
                rows={rows}
                isAdmin={isAdmin}
                reversedIds={reversedIds}
                unit={displayUnit}
              />
            )}
            {pageKind === "issued" && (
              <IssuedTransactionTable
                rows={rows}
                isAdmin={isAdmin}
                reversedIds={reversedIds}
                unit={displayUnit}
              />
            )}
            {pageKind === "consumption" && (
              <ConsumptionTransactionTable
                rows={rows}
                isAdmin={isAdmin}
                reversedIds={reversedIds}
                unit={displayUnit}
              />
            )}
          </div>

          <TransactionPagination page={page} pageSize={pageSize} total={total} />
        </CardContent>
      </Card>

      <TransactionSummaryBar
        pageKind={pageKind}
        summary={summary}
        unit={displayUnit}
      />
    </div>
  );
}
