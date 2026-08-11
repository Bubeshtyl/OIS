import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { lfrInvoices } from "@/lib/db/schema";

export class LfrInvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LfrInvoiceError";
  }
}

export type LfrInvoiceInput = {
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

function toNumericString(value: number): string {
  return value.toFixed(2);
}

export async function createLfrInvoice(input: {
  tenantId: string;
  createdBy: string;
  data: LfrInvoiceInput;
}): Promise<{ id: string }> {
  const db = getDb();
  const d = input.data;

  const [invoice] = await db
    .insert(lfrInvoices)
    .values({
      tenantId: input.tenantId,
      invoiceNo: d.invoiceNo,
      invoiceDate: d.invoiceDate,
      description: d.description,
      itemCodeText: d.itemCodeText,
      hsnSac: d.hsnSac,
      taxableAmount: toNumericString(d.taxableAmount),
      cgstRate: toNumericString(d.cgstRate),
      cgstAmount: toNumericString(d.cgstAmount),
      sgstRate: toNumericString(d.sgstRate),
      sgstAmount: toNumericString(d.sgstAmount),
      totalAmount: toNumericString(d.totalAmount),
      createdBy: input.createdBy,
    })
    .returning({ id: lfrInvoices.id });

  if (!invoice) {
    throw new LfrInvoiceError("Failed to create invoice.");
  }

  return { id: invoice.id };
}

export async function updateLfrInvoice(input: {
  tenantId: string;
  invoiceId: string;
  data: LfrInvoiceInput;
}): Promise<void> {
  const db = getDb();
  const d = input.data;

  const [existing] = await db
    .select({ id: lfrInvoices.id })
    .from(lfrInvoices)
    .where(
      and(
        eq(lfrInvoices.id, input.invoiceId),
        eq(lfrInvoices.tenantId, input.tenantId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new LfrInvoiceError("Invoice not found.");
  }

  const conflict = await db
    .select({ id: lfrInvoices.id })
    .from(lfrInvoices)
    .where(
      and(
        eq(lfrInvoices.tenantId, input.tenantId),
        eq(lfrInvoices.invoiceNo, d.invoiceNo),
        ne(lfrInvoices.id, input.invoiceId)
      )
    )
    .limit(1);

  if (conflict[0]) {
    throw new LfrInvoiceError(`Invoice ${d.invoiceNo} already exists.`);
  }

  await db
    .update(lfrInvoices)
    .set({
      invoiceNo: d.invoiceNo,
      invoiceDate: d.invoiceDate,
      description: d.description,
      itemCodeText: d.itemCodeText,
      hsnSac: d.hsnSac,
      taxableAmount: toNumericString(d.taxableAmount),
      cgstRate: toNumericString(d.cgstRate),
      cgstAmount: toNumericString(d.cgstAmount),
      sgstRate: toNumericString(d.sgstRate),
      sgstAmount: toNumericString(d.sgstAmount),
      totalAmount: toNumericString(d.totalAmount),
      updatedAt: new Date(),
    })
    .where(eq(lfrInvoices.id, input.invoiceId));
}
