import type { DisplayTransactionRow, TransactionListRow } from "@/lib/transactions/types";
import {
  parseInvoiceFromReference,
  parsePackageCountFromNote,
  parseSupplierFromReference,
} from "@/lib/packaging";

type AggregationGroupBy = "date" | "datetime";

function groupKey(row: TransactionListRow, groupBy: AggregationGroupBy) {
  if (groupBy === "datetime") {
    return `${row.createdAt.toISOString()}|${row.productId}|${row.type}`;
  }
  return `${row.transactionDate}|${row.productId}|${row.type}`;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function formatPeopleLabel(names: string[]) {
  const unique = uniqueValues(names);
  if (unique.length === 0) return "—";
  if (unique.length === 1) return unique[0];
  return `${unique.length} people`;
}

function formatLabel(values: string[]) {
  const unique = uniqueValues(values);
  if (unique.length === 0) return "—";
  if (unique.length === 1) return unique[0];
  return "Multiple";
}

export function aggregateTransactionRowsByDateAndProduct(
  rows: TransactionListRow[],
  groupBy: AggregationGroupBy = "date"
): DisplayTransactionRow[] {
  const order: string[] = [];
  const groups = new Map<string, TransactionListRow[]>();

  for (const row of rows) {
    const key = groupKey(row, groupBy);
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  return order.map((key) => {
    const group = groups.get(key)!;

    if (group.length === 1) {
      return {
        ...group[0],
        entryCount: 1,
        isAggregated: false,
      };
    }

    const first = group[0];
    const totalLitres = group.reduce(
      (sum, row) => sum + Number(row.quantity),
      0
    );
    const totalPackages = group.reduce((sum, row) => {
      const count = parsePackageCountFromNote(row.referenceNote);
      return sum + (count ?? 0);
    }, 0);
    const latestCreatedAt = group.reduce(
      (latest, row) =>
        row.createdAt > latest ? row.createdAt : latest,
      group[0].createdAt
    );

    return {
      ...first,
      createdAt: latestCreatedAt,
      id:
        groupBy === "datetime"
          ? `agg-${first.createdAt.toISOString()}-${first.productId}-${first.type}`
          : `agg-${first.transactionDate}-${first.productId}-${first.type}`,
      quantity: String(totalLitres),
      referenceNote:
        totalPackages > 0 ? `Packages: ${totalPackages}` : first.referenceNote,
      createdByName: formatPeopleLabel(group.map((row) => row.createdByName)),
      entryCount: group.length,
      isAggregated: true,
      aggregatedSupplier: formatLabel(
        group.map((row) => parseSupplierFromReference(row.referenceNote))
      ),
      aggregatedInvoice: formatLabel(
        group.map((row) => parseInvoiceFromReference(row.referenceNote))
      ),
    };
  });
}
