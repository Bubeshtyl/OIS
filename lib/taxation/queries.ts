import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  inventoryTransactions,
  lfrInvoices,
  msHsdInvoiceLines,
  msHsdInvoices,
} from "@/lib/db/schema";
import {
  isReplacementReceiveNote,
  parseInvoiceFromReference,
} from "@/lib/packaging";
import {
  computeLfrTds,
  computeMsHsdTds,
  computeOilTds,
  roundMoney,
  TDS_RATE_LFR,
  TDS_RATE_MS_HSD,
  TDS_RATE_OIL,
} from "@/lib/taxation/tds";

export type TaxSource = "MS_HSD" | "LFR" | "OIL";

export type TdsRow = {
  source: TaxSource;
  invoiceNo: string;
  invoiceDate: string;
  baseAmount: number;
  rate: number;
  tdsAmount: number;
  href: string;
};

export type TdsSummary = {
  msHsdTds: number;
  lfrTds: number;
  oilTds: number;
  grandTotal: number;
  baseTotal: number;
};

export type GstRow = {
  source: "LFR" | "OIL";
  invoiceNo: string;
  invoiceDate: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  href: string;
};

export type GstSummary = {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
};

type OilInvoiceAgg = {
  invoiceNo: string;
  invoiceDate: string;
  taxableAmount: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
};

function compareRowsByDateDesc(
  a: { invoiceDate: string; invoiceNo: string },
  b: { invoiceDate: string; invoiceNo: string }
): number {
  if (a.invoiceDate !== b.invoiceDate) {
    return a.invoiceDate < b.invoiceDate ? 1 : -1;
  }
  return a.invoiceNo.localeCompare(b.invoiceNo);
}

function oilEditHref(invoiceNo: string): string {
  return `/receive/bpcl/edit?invoice=${encodeURIComponent(invoiceNo)}`;
}

async function loadMsHsdTdsRows(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<TdsRow[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: msHsdInvoices.id,
      invoiceNo: msHsdInvoices.invoiceNo,
      invoiceDate: msHsdInvoices.invoiceDate,
      baseAmount: sql<string>`coalesce(sum(${msHsdInvoiceLines.totalValue} + ${msHsdInvoiceLines.dlyTaxableCharge}), 0)`,
    })
    .from(msHsdInvoices)
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
      msHsdInvoices.invoiceDate
    )
    .orderBy(desc(msHsdInvoices.invoiceDate), asc(msHsdInvoices.invoiceNo));

  return rows.map((row) => {
    const baseAmount = roundMoney(Number(row.baseAmount));
    return {
      source: "MS_HSD" as const,
      invoiceNo: row.invoiceNo,
      invoiceDate: row.invoiceDate,
      baseAmount,
      rate: TDS_RATE_MS_HSD,
      tdsAmount: computeMsHsdTds(baseAmount),
      href: `/invoice-purchase/ms-hsd-receipts/${row.id}`,
    };
  });
}

async function loadLfrRows(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<
  Array<{
    id: string;
    invoiceNo: string;
    invoiceDate: string;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    totalAmount: number;
  }>
> {
  const db = getDb();

  const rows = await db
    .select({
      id: lfrInvoices.id,
      invoiceNo: lfrInvoices.invoiceNo,
      invoiceDate: lfrInvoices.invoiceDate,
      taxableAmount: lfrInvoices.taxableAmount,
      cgstAmount: lfrInvoices.cgstAmount,
      sgstAmount: lfrInvoices.sgstAmount,
      totalAmount: lfrInvoices.totalAmount,
    })
    .from(lfrInvoices)
    .where(
      and(
        eq(lfrInvoices.tenantId, tenantId),
        gte(lfrInvoices.invoiceDate, startDate),
        lte(lfrInvoices.invoiceDate, endDate)
      )
    )
    .orderBy(desc(lfrInvoices.invoiceDate), asc(lfrInvoices.invoiceNo));

  return rows.map((row) => ({
    id: row.id,
    invoiceNo: row.invoiceNo,
    invoiceDate: row.invoiceDate,
    taxableAmount: Number(row.taxableAmount),
    cgstAmount: Number(row.cgstAmount),
    sgstAmount: Number(row.sgstAmount),
    totalAmount: Number(row.totalAmount),
  }));
}

async function loadOilInvoiceAggs(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<OilInvoiceAgg[]> {
  const db = getDb();

  const rows = await db
    .select({
      transactionDate: inventoryTransactions.transactionDate,
      referenceNote: inventoryTransactions.referenceNote,
      taxableValue: inventoryTransactions.taxableValue,
      discountAmount: inventoryTransactions.discountAmount,
      cgstAmount: inventoryTransactions.cgstAmount,
      sgstAmount: inventoryTransactions.sgstAmount,
    })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.tenantId, tenantId),
        eq(inventoryTransactions.type, "RECEIVE"),
        eq(inventoryTransactions.dealerSource, "BPCL"),
        gte(inventoryTransactions.transactionDate, startDate),
        lte(inventoryTransactions.transactionDate, endDate)
      )
    )
    .orderBy(
      desc(inventoryTransactions.transactionDate),
      desc(inventoryTransactions.createdAt)
    );

  const byInvoice = new Map<string, OilInvoiceAgg>();

  for (const row of rows) {
    if (isReplacementReceiveNote(row.referenceNote)) continue;
    const invoiceNo = parseInvoiceFromReference(row.referenceNote).trim();
    if (!invoiceNo) continue;

    const taxable = Number(row.taxableValue ?? 0);
    const discount = Number(row.discountAmount ?? 0);
    const cgst = Number(row.cgstAmount ?? 0);
    const sgst = Number(row.sgstAmount ?? 0);

    const existing = byInvoice.get(invoiceNo);
    if (!existing) {
      byInvoice.set(invoiceNo, {
        invoiceNo,
        invoiceDate: row.transactionDate,
        taxableAmount: taxable,
        discountAmount: discount,
        cgstAmount: cgst,
        sgstAmount: sgst,
      });
      continue;
    }

    existing.taxableAmount += taxable;
    existing.discountAmount += discount;
    existing.cgstAmount += cgst;
    existing.sgstAmount += sgst;
    // Keep the latest date for the invoice group (rows ordered desc).
    if (row.transactionDate > existing.invoiceDate) {
      existing.invoiceDate = row.transactionDate;
    }
  }

  return [...byInvoice.values()].map((agg) => ({
    ...agg,
    taxableAmount: roundMoney(agg.taxableAmount),
    discountAmount: roundMoney(agg.discountAmount),
    cgstAmount: roundMoney(agg.cgstAmount),
    sgstAmount: roundMoney(agg.sgstAmount),
  }));
}

export async function getTdsReport(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<{ rows: TdsRow[]; summary: TdsSummary }> {
  const [msHsdRows, lfrRaw, oilAggs] = await Promise.all([
    loadMsHsdTdsRows(tenantId, startDate, endDate),
    loadLfrRows(tenantId, startDate, endDate),
    loadOilInvoiceAggs(tenantId, startDate, endDate),
  ]);

  const lfrRows: TdsRow[] = lfrRaw.map((row) => ({
    source: "LFR",
    invoiceNo: row.invoiceNo,
    invoiceDate: row.invoiceDate,
    baseAmount: roundMoney(row.taxableAmount),
    rate: TDS_RATE_LFR,
    tdsAmount: computeLfrTds(row.taxableAmount),
    href: `/invoice-purchase/lfr-receipts/${row.id}`,
  }));

  const oilRows: TdsRow[] = oilAggs.map((agg) => {
    const baseAmount = roundMoney(agg.taxableAmount - agg.discountAmount);
    return {
      source: "OIL" as const,
      invoiceNo: agg.invoiceNo,
      invoiceDate: agg.invoiceDate,
      baseAmount,
      rate: TDS_RATE_OIL,
      tdsAmount: computeOilTds(baseAmount),
      href: oilEditHref(agg.invoiceNo),
    };
  });

  const rows = [...msHsdRows, ...lfrRows, ...oilRows].sort(compareRowsByDateDesc);

  const msHsdTds = roundMoney(
    msHsdRows.reduce((sum, row) => sum + row.tdsAmount, 0)
  );
  const lfrTds = roundMoney(
    lfrRows.reduce((sum, row) => sum + row.tdsAmount, 0)
  );
  const oilTds = roundMoney(
    oilRows.reduce((sum, row) => sum + row.tdsAmount, 0)
  );
  const baseTotal = roundMoney(
    rows.reduce((sum, row) => sum + row.baseAmount, 0)
  );

  return {
    rows,
    summary: {
      msHsdTds,
      lfrTds,
      oilTds,
      grandTotal: roundMoney(msHsdTds + lfrTds + oilTds),
      baseTotal,
    },
  };
}

export async function getGstReport(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<{ rows: GstRow[]; summary: GstSummary }> {
  const [lfrRaw, oilAggs] = await Promise.all([
    loadLfrRows(tenantId, startDate, endDate),
    loadOilInvoiceAggs(tenantId, startDate, endDate),
  ]);

  const lfrRows: GstRow[] = lfrRaw.map((row) => ({
    source: "LFR",
    invoiceNo: row.invoiceNo,
    invoiceDate: row.invoiceDate,
    taxableAmount: roundMoney(row.taxableAmount),
    cgstAmount: roundMoney(row.cgstAmount),
    sgstAmount: roundMoney(row.sgstAmount),
    totalAmount: roundMoney(row.totalAmount),
    href: `/invoice-purchase/lfr-receipts/${row.id}`,
  }));

  const oilRows: GstRow[] = oilAggs.map((agg) => {
    const taxableAmount = roundMoney(agg.taxableAmount);
    const cgstAmount = roundMoney(agg.cgstAmount);
    const sgstAmount = roundMoney(agg.sgstAmount);
    const totalAmount = roundMoney(
      agg.taxableAmount - agg.discountAmount + agg.cgstAmount + agg.sgstAmount
    );
    return {
      source: "OIL" as const,
      invoiceNo: agg.invoiceNo,
      invoiceDate: agg.invoiceDate,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      totalAmount,
      href: oilEditHref(agg.invoiceNo),
    };
  });

  const rows = [...lfrRows, ...oilRows].sort(compareRowsByDateDesc);

  return {
    rows,
    summary: {
      taxableAmount: roundMoney(
        rows.reduce((sum, row) => sum + row.taxableAmount, 0)
      ),
      cgstAmount: roundMoney(
        rows.reduce((sum, row) => sum + row.cgstAmount, 0)
      ),
      sgstAmount: roundMoney(
        rows.reduce((sum, row) => sum + row.sgstAmount, 0)
      ),
      totalAmount: roundMoney(
        rows.reduce((sum, row) => sum + row.totalAmount, 0)
      ),
    },
  };
}
