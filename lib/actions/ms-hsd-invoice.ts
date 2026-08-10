"use server";

import { z } from "zod";
import { revalidateMsHsdPages } from "@/lib/actions/revalidate";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { isMsHsdProduct, MS_HSD_PRODUCTS } from "@/lib/ms-hsd/products";
import {
  createMsHsdInvoice,
  MsHsdInvoiceError,
  updateMsHsdInvoice,
} from "@/lib/ms-hsd/service";
import { validateInvoiceTotals } from "@/lib/ms-hsd/totals";
import { msHsdInvoiceExists } from "@/lib/queries/ms-hsd-invoice";

export type ActionState = {
  success: boolean;
  message?: string;
  error?: string;
  invoiceId?: string;
};

const headerSchema = z.object({
  invoiceNo: z.string().trim().min(1, "Invoice number is required."),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invoice date is required."),
  vatStaxCessTotal: z.coerce.number(),
  roundingOff: z.coerce.number().default(0),
  totalAmount: z.coerce.number().positive("Total amount is required."),
});

const lineSchema = z.object({
  product: z
    .string()
    .refine(isMsHsdProduct, {
      message: `Product must be one of: ${MS_HSD_PRODUCTS.join(", ")}.`,
    }),
  quantityKl: z.coerce.number().positive("Quantity must be greater than 0."),
  ratePerKl: z.coerce.number().nonnegative(),
  totalValue: z.coerce.number().nonnegative(),
  dlyTaxableCharge: z.coerce.number().nonnegative().default(0),
  vatLstRate: z.coerce.number().nonnegative(),
  vatLstAmount: z.coerce.number().nonnegative(),
  additionalVat: z.coerce.number().nonnegative().default(0),
});

function parseFormPayload(formData: FormData) {
  const header = headerSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    invoiceDate: formData.get("invoiceDate"),
    vatStaxCessTotal: formData.get("vatStaxCessTotal"),
    roundingOff: formData.get("roundingOff") || 0,
    totalAmount: formData.get("totalAmount"),
  });

  if (!header.success) {
    return {
      ok: false as const,
      error:
        header.error.issues[0]?.message ??
        "Invoice number, date, and totals are required.",
    };
  }

  let rawLines: unknown;
  try {
    rawLines = JSON.parse(String(formData.get("lines") || "[]"));
  } catch {
    return { ok: false as const, error: "Invalid product lines." };
  }

  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return {
      ok: false as const,
      error: "Enter at least one product line.",
    };
  }

  const parsedLines = z.array(lineSchema).safeParse(rawLines);
  if (!parsedLines.success) {
    return {
      ok: false as const,
      error:
        parsedLines.error.issues[0]?.message ??
        "Please check product line values.",
    };
  }

  const products = parsedLines.data.map((line) => line.product);
  if (new Set(products).size !== products.length) {
    return {
      ok: false as const,
      error: "Each product can only appear once on an invoice.",
    };
  }

  const totalsCheck = validateInvoiceTotals({
    lines: parsedLines.data,
    vatStaxCessTotal: header.data.vatStaxCessTotal,
    roundingOff: header.data.roundingOff,
    totalAmount: header.data.totalAmount,
  });
  if (!totalsCheck.ok) {
    return { ok: false as const, error: totalsCheck.error };
  }

  return {
    ok: true as const,
    header: header.data,
    lines: parsedLines.data,
  };
}

export async function createMsHsdInvoiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = parseFormPayload(formData);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  if (await msHsdInvoiceExists(session.tenantId, parsed.header.invoiceNo)) {
    return {
      success: false,
      error: `Invoice ${parsed.header.invoiceNo} already exists. Edit the existing invoice instead.`,
    };
  }

  try {
    const created = await createMsHsdInvoice({
      tenantId: session.tenantId,
      createdBy: session.userId,
      header: parsed.header,
      lines: parsed.lines,
    });
    revalidateMsHsdPages();
    return {
      success: true,
      message: `Invoice ${parsed.header.invoiceNo} saved.`,
      invoiceId: created.id,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof MsHsdInvoiceError
          ? error.message
          : "Failed to save MS/HSD invoice.",
    };
  }
}

export async function updateMsHsdInvoiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const invoiceId = String(formData.get("invoiceId") || "").trim();
  if (!invoiceId) {
    return { success: false, error: "Invoice id is required." };
  }

  const parsed = parseFormPayload(formData);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  if (
    await msHsdInvoiceExists(
      session.tenantId,
      parsed.header.invoiceNo,
      invoiceId
    )
  ) {
    return {
      success: false,
      error: `Invoice ${parsed.header.invoiceNo} already exists.`,
    };
  }

  try {
    await updateMsHsdInvoice({
      tenantId: session.tenantId,
      invoiceId,
      header: parsed.header,
      lines: parsed.lines,
    });
    revalidateMsHsdPages();
    return {
      success: true,
      message: `Invoice ${parsed.header.invoiceNo} updated.`,
      invoiceId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof MsHsdInvoiceError
          ? error.message
          : "Failed to update MS/HSD invoice.",
    };
  }
}
