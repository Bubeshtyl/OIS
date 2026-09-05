import { and, asc, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { msHsdInvoiceLines, msHsdInvoices } from "@/lib/db/schema";

export type MsHsdInvoiceListItem = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  totalAmount: number;
  productSummary: string;
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

  // Keep the list query lean — no user join / groupBy / string_agg on the hot path.
  const invoices = await db
    .select({
      id: msHsdInvoices.id,
      invoiceNo: msHsdInvoices.invoiceNo,
      invoiceDate: msHsdInvoices.invoiceDate,
      totalAmount: msHsdInvoices.totalAmount,
    })
    .from(msHsdInvoices)
    .where(
      and(
        eq(msHsdInvoices.tenantId, tenantId),
        gte(msHsdInvoices.invoiceDate, startDate),
        lte(msHsdInvoices.invoiceDate, endDate)
      )
    )
    .orderBy(desc(msHsdInvoices.invoiceDate), desc(msHsdInvoices.createdAt));

  if (invoices.length === 0) return [];

  const lineRows = await db
    .select({
      invoiceId: msHsdInvoiceLines.invoiceId,
      product: msHsdInvoiceLines.product,
      lineOrder: msHsdInvoiceLines.lineOrder,
    })
    .from(msHsdInvoiceLines)
    .where(
      inArray(
        msHsdInvoiceLines.invoiceId,
        invoices.map((invoice) => invoice.id)
      )
    )
    .orderBy(asc(msHsdInvoiceLines.lineOrder));

  const productsByInvoice = new Map<string, string[]>();
  for (const line of lineRows) {
    const products = productsByInvoice.get(line.invoiceId) ?? [];
    products.push(line.product);
    productsByInvoice.set(line.invoiceId, products);
  }

  return invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNo: invoice.invoiceNo,
    invoiceDate: invoice.invoiceDate,
    totalAmount: Number(invoice.totalAmount),
    productSummary: productsByInvoice.get(invoice.id)?.join(", ") || "—",
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
