import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import { parseStockDisplayUnit } from "@/lib/format";
import { getActiveProducts, getReversedTransactionIdsFor } from "@/lib/queries/inventory";
import {
  getDistinctCreatorsForType,
  getTransactionList,
  type TransactionListType,
} from "@/lib/queries/transactions";
import type { TransactionPageKind } from "@/lib/transactions/page-config";
import { PAGE_KIND_TO_TYPE } from "@/lib/transactions/page-config";
import { getIstTodayString } from "@/lib/timezone";

export async function loadTransactionPage(
  pageKind: TransactionPageKind,
  searchParams: {
    start?: string;
    end?: string;
    search?: string;
    product?: string;
    recordedBy?: string;
    page?: string;
    unit?: string;
  }
) {
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(searchParams.start) ? searchParams.start : defaultStart,
    isValidDateString(searchParams.end) ? searchParams.end : defaultEnd
  );

  const type: TransactionListType = PAGE_KIND_TO_TYPE[pageKind];
  const page = Math.max(1, Number(searchParams.page) || 1);
  const productId = searchParams.product || undefined;
  const recordedBy = searchParams.recordedBy || undefined;
  const search = searchParams.search || undefined;
  const unit = parseStockDisplayUnit(searchParams.unit);

  const needsCreators = pageKind === "receive";

  const [products, creators, list] = await Promise.all([
    getActiveProducts(),
    needsCreators
      ? getDistinctCreatorsForType(type, start, end)
      : Promise.resolve([]),
    getTransactionList({
      type,
      startDate: start,
      endDate: end,
      productId,
      recordedBy,
      search,
      page,
    }),
  ]);

  const reversedIds =
    list.rows.length > 0
      ? await getReversedTransactionIdsFor(list.rows.map((row) => row.id))
      : [];

  return {
    products,
    creators,
    rows: list.rows,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    summary: list.summary,
    startDate: start,
    endDate: end,
    defaultStart,
    defaultEnd,
    productId,
    recordedBy,
    search,
    reversedIds: Array.from(reversedIds),
    unit,
  };
}
