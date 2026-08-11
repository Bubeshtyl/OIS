import { and, desc, eq, gte, lte, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { lfrInvoices, users } from "@/lib/db/schema";

export type LfrInvoiceListItem = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  description: string;
  hsnSac: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  createdByName: string;
  createdAt: Date;
};

export type LfrInvoiceDetail = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  description: string;
  itemCodeText: string;
  hsnSac: string;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalAmount: number;
};

export async function lfrInvoiceExists(
  tenantId: string,
  invoiceNo: string,
  exceptId?: string
): Promise<boolean> {
  const target = invoiceNo.trim();
  if (!target) return false;

  const db = getDb();
  const conditions = [
    eq(lfrInvoices.tenantId, tenantId),
    eq(lfrInvoices.invoiceNo, target),
  ];
  if (exceptId) {
    conditions.push(ne(lfrInvoices.id, exceptId));
  }

  const [row] = await db
    .select({ id: lfrInvoices.id })
    .from(lfrInvoices)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
}

export async function listLfrInvoices(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<LfrInvoiceListItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: lfrInvoices.id,
      invoiceNo: lfrInvoices.invoiceNo,
      invoiceDate: lfrInvoices.invoiceDate,
      description: lfrInvoices.description,
      hsnSac: lfrInvoices.hsnSac,
      taxableAmount: lfrInvoices.taxableAmount,
      cgstAmount: lfrInvoices.cgstAmount,
      sgstAmount: lfrInvoices.sgstAmount,
      totalAmount: lfrInvoices.totalAmount,
      createdAt: lfrInvoices.createdAt,
      createdByName: users.name,
    })
    .from(lfrInvoices)
    .innerJoin(users, eq(lfrInvoices.createdBy, users.id))
    .where(
      and(
        eq(lfrInvoices.tenantId, tenantId),
        gte(lfrInvoices.invoiceDate, startDate),
        lte(lfrInvoices.invoiceDate, endDate)
      )
    )
    .orderBy(desc(lfrInvoices.invoiceDate), desc(lfrInvoices.createdAt));

  return rows.map((row) => ({
    id: row.id,
    invoiceNo: row.invoiceNo,
    invoiceDate: row.invoiceDate,
    description: row.description,
    hsnSac: row.hsnSac,
    taxableAmount: Number(row.taxableAmount),
    cgstAmount: Number(row.cgstAmount),
    sgstAmount: Number(row.sgstAmount),
    totalAmount: Number(row.totalAmount),
    createdByName: row.createdByName,
    createdAt: row.createdAt,
  }));
}

export async function getLfrInvoiceById(
  tenantId: string,
  invoiceId: string
): Promise<LfrInvoiceDetail | null> {
  const db = getDb();

  const [invoice] = await db
    .select()
    .from(lfrInvoices)
    .where(
      and(eq(lfrInvoices.id, invoiceId), eq(lfrInvoices.tenantId, tenantId))
    )
    .limit(1);

  if (!invoice) return null;

  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: invoice.invoiceDate,
    description: invoice.description,
    itemCodeText: invoice.itemCodeText,
    hsnSac: invoice.hsnSac,
    taxableAmount: Number(invoice.taxableAmount),
    cgstRate: Number(invoice.cgstRate),
    cgstAmount: Number(invoice.cgstAmount),
    sgstRate: Number(invoice.sgstRate),
    sgstAmount: Number(invoice.sgstAmount),
    totalAmount: Number(invoice.totalAmount),
  };
}
