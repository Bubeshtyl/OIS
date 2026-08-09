import type {
  DisplayTransactionRow,
  TransactionListRow,
} from "@/lib/transactions/types";
import {
  parseInvoiceFromReference,
  parseReplacementOriginalInvoice,
  parseSupplierFromReference,
} from "@/lib/packaging";

export type ReceiveDisplayRow = DisplayTransactionRow & {
  /** True when this receive is a replacement for returned cases on another invoice. */
  isReplacementReceive: boolean;
  /** Replacement invoice number (e.g. inv003), when isReplacementReceive. */
  replacementInvoice: string | null;
};

export type ReceiveInvoiceGroup = {
  key: string;
  invoice: string;
  supplier: string;
  dealerSource: string | null;
  lines: ReceiveDisplayRow[];
  latestCreatedAt: Date;
};

function toDisplayRow(row: TransactionListRow): ReceiveDisplayRow {
  const originalInvoice = parseReplacementOriginalInvoice(row.referenceNote);
  const invoiceOnNote = parseInvoiceFromReference(row.referenceNote).trim();
  const isReplacementReceive = originalInvoice.length > 0;
  return {
    ...row,
    entryCount: 1,
    isAggregated: false,
    isReplacementReceive,
    replacementInvoice: isReplacementReceive
      ? invoiceOnNote || null
      : null,
  };
}

/** Group under the original invoice when this line is a return replacement. */
function invoiceForGrouping(row: TransactionListRow): string {
  const original = parseReplacementOriginalInvoice(row.referenceNote).trim();
  if (original) return original;
  return parseInvoiceFromReference(row.referenceNote).trim();
}

function invoiceKey(row: TransactionListRow): string {
  const invoice = invoiceForGrouping(row);
  if (!invoice) return `row:${row.id}`;
  const dealer = (
    row.dealerSource ||
    parseSupplierFromReference(row.referenceNote) ||
    "UNKNOWN"
  )
    .trim()
    .toUpperCase();
  return `${dealer}::${invoice}`;
}

function supplierLabel(row: TransactionListRow): string {
  if (row.dealerSource === "BPCL") return "BPCL";
  return (
    parseSupplierFromReference(row.referenceNote) || row.dealerSource || "—"
  );
}

/** Group receive lines by dealer + invoice for accordion display. */
export function groupReceiveRowsByInvoice(
  rows: TransactionListRow[]
): ReceiveInvoiceGroup[] {
  const order: string[] = [];
  const groups = new Map<string, TransactionListRow[]>();

  for (const row of rows) {
    const key = invoiceKey(row);
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  return order
    .map((key) => {
      const lines = (groups.get(key) ?? []).map(toDisplayRow);
      lines.sort((a, b) => {
        // Original lines first, then replacements; product name within each.
        if (a.isReplacementReceive !== b.isReplacementReceive) {
          return a.isReplacementReceive ? 1 : -1;
        }
        return (
          a.productName.localeCompare(b.productName) ||
          b.createdAt.getTime() - a.createdAt.getTime()
        );
      });
      const firstOriginal =
        lines.find((line) => !line.isReplacementReceive) ?? lines[0];
      const invoice = invoiceForGrouping(firstOriginal) || "—";
      const latestCreatedAt = lines.reduce(
        (latest, row) => (row.createdAt > latest ? row.createdAt : latest),
        firstOriginal.createdAt
      );
      return {
        key,
        invoice,
        supplier: supplierLabel(firstOriginal),
        dealerSource: firstOriginal.dealerSource,
        lines,
        latestCreatedAt,
      };
    })
    .sort((a, b) => b.latestCreatedAt.getTime() - a.latestCreatedAt.getTime());
}
