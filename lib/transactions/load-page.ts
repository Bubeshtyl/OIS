import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import { parseStockDisplayUnit } from "@/lib/format";
import { getActiveProducts } from "@/lib/queries/inventory";
import {
  getAllTransactionRows,
  getDistinctCreatorsForType,
  type TransactionListType,
} from "@/lib/queries/transactions";
import type { TransactionPageKind } from "@/lib/transactions/page-config";
import { PAGE_KIND_TO_TYPE } from "@/lib/transactions/page-config";
import { getIstTodayString } from "@/lib/timezone";

function parsePage(value?: string): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function loadTransactionPage(
  tenantId: string,
  pageKind: TransactionPageKind,
  searchParams: {
    start?: string;
    end?: string;
    recordedBy?: string;
    unit?: string;
    page?: string;
  }
) {
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(searchParams.start) ? searchParams.start : defaultStart,
    isValidDateString(searchParams.end) ? searchParams.end : defaultEnd
  );

  const types: TransactionListType[] =
    pageKind === "consumption"
      ? (["SALE", "RETURNED", "DAMAGED"] as TransactionListType[])
      : [PAGE_KIND_TO_TYPE[pageKind]];

  const recordedBy = searchParams.recordedBy || undefined;
  const unit = parseStockDisplayUnit(searchParams.unit);
  const page = parsePage(searchParams.page);

  // Receive has no staff filter and no "new transaction" dialog — skip those queries.
  const needsProducts = pageKind !== "receive";
  const needsCreators = pageKind !== "receive" && pageKind !== "issued";

  const [products, creators, list] = await Promise.all([
    needsProducts ? getActiveProducts(tenantId) : Promise.resolve([]),
    needsCreators
      ? getDistinctCreatorsForType(tenantId, types[0], start, end)
      : Promise.resolve([]),
    getAllTransactionRows({
      tenantId,
      types,
      startDate: start,
      endDate: end,
      recordedBy,
      page,
    }),
  ]);

  return {
    products,
    creators,
    rows: list.rows,
    summary: list.summary,
    totalCount: list.totalCount,
    page: list.page,
    pageSize: list.pageSize,
    startDate: start,
    endDate: end,
    defaultStart,
    defaultEnd,
    recordedBy,
    unit,
  };
}
