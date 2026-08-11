"use server";

import { z } from "zod";
import { revalidateLfrPages } from "@/lib/actions/revalidate";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import {
  createLfrInvoice,
  LfrInvoiceError,
  updateLfrInvoice,
} from "@/lib/lfr/service";
import { validateLfrInvoiceTotals } from "@/lib/lfr/totals";
import { lfrInvoiceExists } from "@/lib/queries/lfr-invoice";

export type ActionState = {
  success: boolean;
  message?: string;
  error?: string;
  invoiceId?: string;
};

const invoiceSchema = z.object({
  invoiceNo: z.string().trim().min(1, "Invoice number is required."),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invoice date is required."),
  description: z.string().trim().min(1, "Description of Goods is required."),
  itemCodeText: z.string().trim(),
  hsnSac: z.string().trim(),
  taxableAmount: z.coerce
    .number()
    .positive("Taxable amount must be greater than 0."),
  cgstRate: z.coerce.number().nonnegative(),
  cgstAmount: z.coerce.number().nonnegative(),
  sgstRate: z.coerce.number().nonnegative(),
  sgstAmount: z.coerce.number().nonnegative(),
  totalAmount: z.coerce.number().positive("Total amount is required."),
});

function parseFormPayload(formData: FormData) {
  const parsed = invoiceSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    invoiceDate: formData.get("invoiceDate"),
    description: formData.get("description"),
    itemCodeText: String(formData.get("itemCodeText") ?? "").trim(),
    hsnSac: String(formData.get("hsnSac") ?? "").trim(),
    taxableAmount: formData.get("taxableAmount"),
    cgstRate: formData.get("cgstRate"),
    cgstAmount: formData.get("cgstAmount"),
    sgstRate: formData.get("sgstRate"),
    sgstAmount: formData.get("sgstAmount"),
    totalAmount: formData.get("totalAmount"),
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      error:
        parsed.error.issues[0]?.message ??
        "Please check invoice fields and try again.",
    };
  }

  const totalsCheck = validateLfrInvoiceTotals({
    taxableAmount: parsed.data.taxableAmount,
    cgstAmount: parsed.data.cgstAmount,
    sgstAmount: parsed.data.sgstAmount,
    totalAmount: parsed.data.totalAmount,
  });
  if (!totalsCheck.ok) {
    return { ok: false as const, error: totalsCheck.error };
  }

  return { ok: true as const, data: parsed.data };
}

export async function createLfrInvoiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "taxation:read"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = parseFormPayload(formData);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  if (await lfrInvoiceExists(session.tenantId, parsed.data.invoiceNo)) {
    return {
      success: false,
      error: `Invoice ${parsed.data.invoiceNo} already exists. Edit the existing invoice instead.`,
    };
  }

  try {
    const created = await createLfrInvoice({
      tenantId: session.tenantId,
      createdBy: session.userId,
      data: parsed.data,
    });
    revalidateLfrPages();
    return {
      success: true,
      message: `Invoice ${parsed.data.invoiceNo} saved.`,
      invoiceId: created.id,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof LfrInvoiceError
          ? error.message
          : "Failed to save LFR invoice.",
    };
  }
}

export async function updateLfrInvoiceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "taxation:read"))) {
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
    await lfrInvoiceExists(session.tenantId, parsed.data.invoiceNo, invoiceId)
  ) {
    return {
      success: false,
      error: `Invoice ${parsed.data.invoiceNo} already exists.`,
    };
  }

  try {
    await updateLfrInvoice({
      tenantId: session.tenantId,
      invoiceId,
      data: parsed.data,
    });
    revalidateLfrPages();
    return {
      success: true,
      message: `Invoice ${parsed.data.invoiceNo} updated.`,
      invoiceId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof LfrInvoiceError
          ? error.message
          : "Failed to update LFR invoice.",
    };
  }
}
