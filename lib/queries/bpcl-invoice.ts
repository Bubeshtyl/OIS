import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  inventoryTransactions,
  oilProducts,
  returnedCases,
} from "@/lib/db/schema";
import {
  parseInvoiceFromReference,
  parsePackageCountFromNote,
} from "@/lib/packaging";

export type BpclInvoiceLine = {
  id: string;
  productId: string;
  productName: string;
  transactionDate: string;
  quantityLitres: number;
  packageCount: number;
  returnedCases: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  discountAmount: number;
  landingPrice: number | null;
  invoice: string;
};

export async function listBpclReceiveRows(tenantId: string) {
  const db = getDb();
  return db
    .select({
      id: inventoryTransactions.id,
      productId: inventoryTransactions.productId,
      productName: oilProducts.name,
      transactionDate: inventoryTransactions.transactionDate,
      quantity: inventoryTransactions.quantity,
      referenceNote: inventoryTransactions.referenceNote,
      taxableValue: inventoryTransactions.taxableValue,
      cgstAmount: inventoryTransactions.cgstAmount,
      sgstAmount: inventoryTransactions.sgstAmount,
      discountAmount: inventoryTransactions.discountAmount,
      landingPrice: inventoryTransactions.landingPrice,
      returnedCases: returnedCases.casesReturned,
    })
    .from(inventoryTransactions)
    .innerJoin(
      oilProducts,
      eq(inventoryTransactions.productId, oilProducts.id)
    )
    .leftJoin(
      returnedCases,
      eq(returnedCases.receiveTransactionId, inventoryTransactions.id)
    )
    .where(
      and(
        eq(inventoryTransactions.tenantId, tenantId),
        eq(inventoryTransactions.type, "RECEIVE"),
        eq(inventoryTransactions.dealerSource, "BPCL")
      )
    )
    .orderBy(desc(inventoryTransactions.createdAt));
}

function toInvoiceLine(
  row: Awaited<ReturnType<typeof listBpclReceiveRows>>[number]
): BpclInvoiceLine | null {
  const invoice = parseInvoiceFromReference(row.referenceNote);
  if (!invoice) return null;
  const packageCount = parsePackageCountFromNote(row.referenceNote) ?? 0;
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    transactionDate: row.transactionDate,
    quantityLitres: Number(row.quantity),
    packageCount,
    returnedCases: row.returnedCases ?? 0,
    taxableValue: Number(row.taxableValue ?? 0),
    cgstAmount: Number(row.cgstAmount ?? 0),
    sgstAmount: Number(row.sgstAmount ?? 0),
    discountAmount: Number(row.discountAmount ?? 0),
    landingPrice:
      row.landingPrice != null ? Number(row.landingPrice) : null,
    invoice,
  };
}

export async function getBpclInvoiceBatch(
  tenantId: string,
  invoice: string
): Promise<BpclInvoiceLine[]> {
  const target = invoice.trim();
  if (!target) return [];

  const rows = await listBpclReceiveRows(tenantId);
  return rows
    .map(toInvoiceLine)
    .filter((line): line is BpclInvoiceLine => line?.invoice === target);
}

export async function bpclInvoiceExists(
  tenantId: string,
  invoice: string,
  exceptInvoice?: string
): Promise<boolean> {
  const target = invoice.trim();
  if (!target) return false;

  const rows = await listBpclReceiveRows(tenantId);
  for (const row of rows) {
    const parsed = parseInvoiceFromReference(row.referenceNote);
    if (!parsed) continue;
    if (exceptInvoice && parsed === exceptInvoice.trim()) continue;
    if (parsed === target) return true;
  }
  return false;
}
