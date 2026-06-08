"use client";

import { useEffect, useMemo, useState } from "react";
import type { OilProduct } from "@/lib/db/schema";
import {
  TRANSACTION_LIST_PAGE_SIZE,
  type TransactionListRow,
  type TransactionListSummary,
} from "@/lib/transactions/types";
import type { TransactionPageKind } from "@/lib/transactions/page-config";
import { PAGE_CONFIG } from "@/lib/transactions/page-config";
import { aggregateTransactionRowsByDateAndProduct } from "@/lib/transactions/aggregate-rows";
import { filterTransactionRows } from "@/lib/transactions/client-search";
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
  summary,
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
  recordedBy,
  isAdmin,
  reversedIds,
  unit: initialUnit = "packets",
}: {
  pageKind: TransactionPageKind;
  products: OilProduct[];
  creators: Array<{ id: string; name: string }>;
  rows: TransactionListRow[];
  summary: TransactionListSummary;
  startDate: string;
  endDate: string;
  defaultStart: string;
  defaultEnd: string;
  recordedBy?: string;
  isAdmin: boolean;
  reversedIds: string[];
  unit?: StockDisplayUnit;
}) {
  const config = PAGE_CONFIG[pageKind];
  const { unit: displayUnit, setDisplayUnit } = useStockDisplayUnit(initialUnit);
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);

  const displayRows = useMemo(() => {
    const filtered = filterTransactionRows(rows, searchDraft);
    return aggregateTransactionRowsByDateAndProduct(filtered);
  }, [rows, searchDraft]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * TRANSACTION_LIST_PAGE_SIZE;
    return displayRows.slice(start, start + TRANSACTION_LIST_PAGE_SIZE);
  }, [displayRows, page]);

  useEffect(() => {
    setPage(1);
  }, [searchDraft, rows, startDate, endDate, recordedBy]);

  const extraParams = buildFilterExtraParams({
    recordedBy,
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
            creators={creators}
            recordedBy={recordedBy}
            searchValue={searchDraft}
            onSearchChange={setSearchDraft}
            unit={displayUnit}
            onUnitChange={setDisplayUnit}
          />

          <div className="overflow-x-auto rounded-lg border [scrollbar-gutter:stable]">
            {pageKind === "receive" && (
              <ReceiveTransactionTable
                rows={pageRows}
                isAdmin={isAdmin}
                reversedIds={reversedIds}
                unit={displayUnit}
              />
            )}
            {pageKind === "issued" && (
              <IssuedTransactionTable
                rows={pageRows}
                isAdmin={isAdmin}
                reversedIds={reversedIds}
                unit={displayUnit}
              />
            )}
            {pageKind === "consumption" && (
              <ConsumptionTransactionTable
                rows={pageRows}
                isAdmin={isAdmin}
                reversedIds={reversedIds}
                unit={displayUnit}
              />
            )}
          </div>

          <TransactionPagination
            page={page}
            pageSize={TRANSACTION_LIST_PAGE_SIZE}
            total={displayRows.length}
            onPageChange={setPage}
          />
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
