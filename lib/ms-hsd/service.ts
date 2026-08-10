import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { msHsdInvoiceLines, msHsdInvoices } from "@/lib/db/schema";

export class MsHsdInvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MsHsdInvoiceError";
  }
}

export type MsHsdLineInput = {
  product: string;
  quantityKl: number;
  ratePerKl: number;
  totalValue: number;
  dlyTaxableCharge: number;
  vatLstRate: number;
  vatLstAmount: number;
  additionalVat: number;
};

export type MsHsdInvoiceHeaderInput = {
  invoiceNo: string;
  invoiceDate: string;
  vatStaxCessTotal: number;
  roundingOff: number;
  totalAmount: number;
};

function toNumericString(value: number): string {
  return value.toFixed(2);
}

function toQtyString(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

export async function createMsHsdInvoice(input: {
  tenantId: string;
  createdBy: string;
  header: MsHsdInvoiceHeaderInput;
  lines: MsHsdLineInput[];
}): Promise<{ id: string }> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(msHsdInvoices)
      .values({
        tenantId: input.tenantId,
        invoiceNo: input.header.invoiceNo,
        invoiceDate: input.header.invoiceDate,
        vatStaxCessTotal: toNumericString(input.header.vatStaxCessTotal),
        roundingOff: toNumericString(input.header.roundingOff),
        totalAmount: toNumericString(input.header.totalAmount),
        createdBy: input.createdBy,
      })
      .returning({ id: msHsdInvoices.id });

    if (!invoice) {
      throw new MsHsdInvoiceError("Failed to create invoice.");
    }

    await tx.insert(msHsdInvoiceLines).values(
      input.lines.map((line, index) => ({
        invoiceId: invoice.id,
        lineOrder: index,
        product: line.product,
        quantityKl: toQtyString(line.quantityKl),
        ratePerKl: toNumericString(line.ratePerKl),
        totalValue: toNumericString(line.totalValue),
        dlyTaxableCharge: toNumericString(line.dlyTaxableCharge),
        vatLstRate: toNumericString(line.vatLstRate),
        vatLstAmount: toNumericString(line.vatLstAmount),
        additionalVat: toNumericString(line.additionalVat),
      }))
    );

    return { id: invoice.id };
  });
}

export async function updateMsHsdInvoice(input: {
  tenantId: string;
  invoiceId: string;
  header: MsHsdInvoiceHeaderInput;
  lines: MsHsdLineInput[];
}): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: msHsdInvoices.id })
      .from(msHsdInvoices)
      .where(
        and(
          eq(msHsdInvoices.id, input.invoiceId),
          eq(msHsdInvoices.tenantId, input.tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new MsHsdInvoiceError("Invoice not found.");
    }

    const conflict = await tx
      .select({ id: msHsdInvoices.id })
      .from(msHsdInvoices)
      .where(
        and(
          eq(msHsdInvoices.tenantId, input.tenantId),
          eq(msHsdInvoices.invoiceNo, input.header.invoiceNo),
          ne(msHsdInvoices.id, input.invoiceId)
        )
      )
      .limit(1);

    if (conflict[0]) {
      throw new MsHsdInvoiceError(
        `Invoice ${input.header.invoiceNo} already exists.`
      );
    }

    await tx
      .update(msHsdInvoices)
      .set({
        invoiceNo: input.header.invoiceNo,
        invoiceDate: input.header.invoiceDate,
        vatStaxCessTotal: toNumericString(input.header.vatStaxCessTotal),
        roundingOff: toNumericString(input.header.roundingOff),
        totalAmount: toNumericString(input.header.totalAmount),
        updatedAt: new Date(),
      })
      .where(eq(msHsdInvoices.id, input.invoiceId));

    await tx
      .delete(msHsdInvoiceLines)
      .where(eq(msHsdInvoiceLines.invoiceId, input.invoiceId));

    await tx.insert(msHsdInvoiceLines).values(
      input.lines.map((line, index) => ({
        invoiceId: input.invoiceId,
        lineOrder: index,
        product: line.product,
        quantityKl: toQtyString(line.quantityKl),
        ratePerKl: toNumericString(line.ratePerKl),
        totalValue: toNumericString(line.totalValue),
        dlyTaxableCharge: toNumericString(line.dlyTaxableCharge),
        vatLstRate: toNumericString(line.vatLstRate),
        vatLstAmount: toNumericString(line.vatLstAmount),
        additionalVat: toNumericString(line.additionalVat),
      }))
    );
  });
}
