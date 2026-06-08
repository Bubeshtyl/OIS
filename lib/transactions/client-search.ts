import type { TransactionListRow } from "@/lib/transactions/types";
import {
  parseInvoiceFromReference,
  parseSupplierFromReference,
  parseUserNoteFromReference,
} from "@/lib/packaging";

export function filterTransactionRows(
  rows: TransactionListRow[],
  term: string
) {
  const query = term.trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.productName,
      row.createdByName,
      row.referenceNote,
      parseSupplierFromReference(row.referenceNote),
      parseInvoiceFromReference(row.referenceNote),
      parseUserNoteFromReference(row.referenceNote),
    ];

    return haystack.some((value) => value?.toLowerCase().includes(query));
  });
}
