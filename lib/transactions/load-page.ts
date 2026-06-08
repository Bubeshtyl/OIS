import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import { parseStockDisplayUnit } from "@/lib/format";
import { getActiveProducts, getReversedTransactionIdsFor } from "@/lib/queries/inventory";
import {
  getAllTransactionRows,
  getDistinctCreatorsForType,
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
    recordedBy?: string;
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

  const types: TransactionListType[] =
    pageKind === "consumption"
      ? (["SALE", "RETURNED", "DAMAGED"] as TransactionListType[])
      : [PAGE_KIND_TO_TYPE[pageKind]];

  const recordedBy = searchParams.recordedBy || undefined;
  const unit = parseStockDisplayUnit(searchParams.unit);

  const needsCreators = pageKind === "receive";

  const [products, creators, list] = await Promise.all([
    getActiveProducts(),
    needsCreators
      ? getDistinctCreatorsForType(types[0], start, end)
      : Promise.resolve([]),
    getAllTransactionRows({
      types,
      startDate: start,
      endDate: end,
      recordedBy,
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
    summary: list.summary,
    startDate: start,
    endDate: end,
    defaultStart,
    defaultEnd,
    recordedBy,
    reversedIds: Array.from(reversedIds),
    unit,
  };
}
