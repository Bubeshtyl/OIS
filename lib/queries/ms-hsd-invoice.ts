import { and, asc, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { msHsdInvoiceLines, msHsdInvoices, users } from "@/lib/db/schema";

export type MsHsdInvoiceListItem = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  vatStaxCessTotal: number;
  roundingOff: number;
  totalAmount: number;
  productSummary: string;
  lineCount: number;
  createdByName: string;
  createdAt: Date;
};

export type MsHsdInvoiceDetailLine = {
  id: string;
  lineOrder: number;
  product: string;
  quantityKl: number;
  ratePerKl: number;
  totalValue: number;
  dlyTaxableCharge: number;
  vatLstRate: number;
  vatLstAmount: number;
  additionalVat: number;
};

export type MsHsdInvoiceDetail = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  vatStaxCessTotal: number;
  roundingOff: number;
  totalAmount: number;
  lines: MsHsdInvoiceDetailLine[];
};

export async function msHsdInvoiceExists(
  tenantId: string,
  invoiceNo: string,
  exceptId?: string
): Promise<boolean> {
  const target = invoiceNo.trim();
  if (!target) return false;

  const db = getDb();
  const conditions = [
    eq(msHsdInvoices.tenantId, tenantId),
    eq(msHsdInvoices.invoiceNo, target),
  ];
  if (exceptId) {
    conditions.push(ne(msHsdInvoices.id, exceptId));
  }

  const [row] = await db
    .select({ id: msHsdInvoices.id })
    .from(msHsdInvoices)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
}

export async function listMsHsdInvoices(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<MsHsdInvoiceListItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: msHsdInvoices.id,
      invoiceNo: msHsdInvoices.invoiceNo,
      invoiceDate: msHsdInvoices.invoiceDate,
      vatStaxCessTotal: msHsdInvoices.vatStaxCessTotal,
      roundingOff: msHsdInvoices.roundingOff,
      totalAmount: msHsdInvoices.totalAmount,
      createdAt: msHsdInvoices.createdAt,
      createdByName: users.name,
      productSummary: sql<string>`string_agg(${msHsdInvoiceLines.product}, ', ' ORDER BY ${msHsdInvoiceLines.lineOrder})`,
      lineCount: sql<number>`count(${msHsdInvoiceLines.id})::int`,
    })
    .from(msHsdInvoices)
    .innerJoin(users, eq(msHsdInvoices.createdBy, users.id))
    .leftJoin(
      msHsdInvoiceLines,
      eq(msHsdInvoiceLines.invoiceId, msHsdInvoices.id)
    )
    .where(
      and(
        eq(msHsdInvoices.tenantId, tenantId),
        gte(msHsdInvoices.invoiceDate, startDate),
        lte(msHsdInvoices.invoiceDate, endDate)
      )
    )
    .groupBy(
      msHsdInvoices.id,
      msHsdInvoices.invoiceNo,
      msHsdInvoices.invoiceDate,
      msHsdInvoices.vatStaxCessTotal,
      msHsdInvoices.roundingOff,
      msHsdInvoices.totalAmount,
      msHsdInvoices.createdAt,
      users.name
    )
    .orderBy(desc(msHsdInvoices.invoiceDate), desc(msHsdInvoices.createdAt));

  return rows.map((row) => ({
    id: row.id,
    invoiceNo: row.invoiceNo,
    invoiceDate: row.invoiceDate,
    vatStaxCessTotal: Number(row.vatStaxCessTotal),
    roundingOff: Number(row.roundingOff),
    totalAmount: Number(row.totalAmount),
    productSummary: row.productSummary || "—",
    lineCount: Number(row.lineCount ?? 0),
    createdByName: row.createdByName,
    createdAt: row.createdAt,
  }));
}

export async function getMsHsdInvoiceById(
  tenantId: string,
  invoiceId: string
): Promise<MsHsdInvoiceDetail | null> {
  const db = getDb();

  const [invoice] = await db
    .select()
    .from(msHsdInvoices)
    .where(
      and(
        eq(msHsdInvoices.id, invoiceId),
        eq(msHsdInvoices.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!invoice) return null;

  const lines = await db
    .select()
    .from(msHsdInvoiceLines)
    .where(eq(msHsdInvoiceLines.invoiceId, invoice.id))
    .orderBy(asc(msHsdInvoiceLines.lineOrder));

  return {
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: invoice.invoiceDate,
    vatStaxCessTotal: Number(invoice.vatStaxCessTotal),
    roundingOff: Number(invoice.roundingOff),
    totalAmount: Number(invoice.totalAmount),
    lines: lines.map((line) => ({
      id: line.id,
      lineOrder: line.lineOrder,
      product: line.product,
      quantityKl: Number(line.quantityKl),
      ratePerKl: Number(line.ratePerKl),
      totalValue: Number(line.totalValue),
      dlyTaxableCharge: Number(line.dlyTaxableCharge),
      vatLstRate: Number(line.vatLstRate),
      vatLstAmount: Number(line.vatLstAmount),
      additionalVat: Number(line.additionalVat),
    })),
  };
}
