"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OilProduct } from "@/lib/db/schema";
import type { TransactionListRow, TransactionListSummary } from "@/lib/transactions/types";
import type { TransactionPageKind } from "@/lib/transactions/page-config";
import { PAGE_CONFIG } from "@/lib/transactions/page-config";
import { aggregateTransactionRowsByDateAndProduct } from "@/lib/transactions/aggregate-rows";
import { filterTransactionRows } from "@/lib/transactions/client-search";
import { groupReceiveRowsByInvoice } from "@/lib/transactions/group-receive-by-invoice";
import { buildFilterExtraParams } from "@/lib/transactions/url-params";
import type { StockDisplayUnit } from "@/lib/format";
import { useStockDisplayUnit } from "@/components/shared/use-stock-display-unit";
import { ConsumptionTransactionTable } from "@/components/transactions/consumption-transaction-table";
import { IssuedTransactionTable } from "@/components/transactions/issued-transaction-table";
import { NewTransactionDialog } from "@/components/transactions/new-transaction-dialog";
import { OpenReturnsPanel } from "@/components/transactions/open-returns-panel";
import { ReceiveTransactionTable } from "@/components/transactions/receive-transaction-table";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionPagination } from "@/components/transactions/transaction-pagination";
import { TransactionSummaryBar } from "@/components/transactions/transaction-summary-bar";
import { DateRangePicker } from "@/components/layout/date-range-picker";
import { PageHeader } from "@/components/shared/page-blocks";
import { Card, CardContent } from "@/components/ui/card";
import type { OpenReturnedCaseRow } from "@/lib/queries/returned-cases";

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
  unit: initialUnit = "packets",
  openReturns = [],
  canWriteReturns = false,
  /** When false, skip title / BPCL links (rendered by the page shell for faster FCP). */
  showPageChrome = true,
  page = 1,
  pageSize,
  totalCount,
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
  unit?: StockDisplayUnit;
  openReturns?: OpenReturnedCaseRow[];
  canWriteReturns?: boolean;
  showPageChrome?: boolean;
  page?: number;
  pageSize: number;
  totalCount: number;
}) {
  const config = PAGE_CONFIG[pageKind];
  const { unit: displayUnit, setDisplayUnit } = useStockDisplayUnit(initialUnit);
  const [searchDraft, setSearchDraft] = useState("");

  const filteredRows = useMemo(
    () => filterTransactionRows(rows, searchDraft),
    [rows, searchDraft]
  );

  const receiveGroups = useMemo(
    () =>
      pageKind === "receive" ? groupReceiveRowsByInvoice(filteredRows) : [],
    [pageKind, filteredRows]
  );

  const displayRows = useMemo(() => {
    if (pageKind === "receive") return [];
    const groupBy = pageKind === "consumption" ? "datetime" : "date";
    return aggregateTransactionRowsByDateAndProduct(filteredRows, groupBy);
  }, [filteredRows, pageKind]);

  const searching = searchDraft.trim().length > 0;
  const paginationTotal = searching
    ? pageKind === "receive"
      ? receiveGroups.length
      : displayRows.length
    : totalCount;

  const extraParams = buildFilterExtraParams({
    recordedBy,
  });

  return (
    <div className="space-y-6">
      {showPageChrome ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <PageHeader title={config.title} subtitle={config.subtitle} />
          {pageKind !== "receive" ? (
            <NewTransactionDialog
              pageKind={pageKind}
              products={products}
              buttonLabel={config.newButtonLabel}
            />
          ) : null}
        </div>
      ) : null}

      {showPageChrome && pageKind === "receive" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/receive/bpcl"
            className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
          >
            <p className="font-medium">BPCL</p>
          </Link>
          <Link
            href="/receive/other"
            className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
          >
            <p className="font-medium">Other dealers</p>
          </Link>
        </div>
      ) : null}

      {pageKind === "receive" ? (
        <OpenReturnsPanel rows={openReturns} canWrite={canWriteReturns} />
      ) : null}

      <Card className="border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            defaultStart={defaultStart}
            defaultEnd={defaultEnd}
            extraParams={extraParams}
            className="h-9 w-full justify-start gap-2 bg-background shadow-none sm:w-auto"
          />
          <TransactionFilters
            pageKind={pageKind}
            creators={creators}
            recordedBy={recordedBy}
            searchValue={searchDraft}
            onSearchChange={setSearchDraft}
            unit={displayUnit}
            onUnitChange={setDisplayUnit}
          />

          {searching ? (
            <p className="text-sm text-muted-foreground">
              Search filters this page only. Clear search to browse all pages.
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border [scrollbar-gutter:stable]">
            {pageKind === "receive" && (
              <ReceiveTransactionTable
                groups={receiveGroups}
                unit={displayUnit}
              />
            )}
            {pageKind === "issued" && (
              <IssuedTransactionTable rows={displayRows} unit={displayUnit} />
            )}
            {pageKind === "consumption" && (
              <ConsumptionTransactionTable
                rows={displayRows}
                unit={displayUnit}
              />
            )}
          </div>

          {!searching ? (
            <TransactionPagination
              page={page}
              pageSize={pageSize}
              total={paginationTotal}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Showing {paginationTotal} match
              {paginationTotal === 1 ? "" : "es"} on this page
            </p>
          )}
        </CardContent>
      </Card>

      {pageKind !== "receive" ? (
        <TransactionSummaryBar
          pageKind={pageKind}
          summary={summary}
          unit={displayUnit}
        />
      ) : null}
    </div>
  );
}
