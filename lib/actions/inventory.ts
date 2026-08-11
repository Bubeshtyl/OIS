"use server";

import { z } from "zod";
import { revalidateInventoryPages } from "@/lib/actions/revalidate";
import { hasPermission } from "@/lib/auth/rbac";
import { requireTenantSession } from "@/lib/auth/permissions";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oilProducts } from "@/lib/db/schema";
import {
  createBpclReceiveBatch,
  createInventoryTransaction,
  getProductBalance,
  InventoryError,
  markReturnedCaseReplaced,
  updateBpclReceiveBatch,
  type BpclReceiveLineInput,
} from "@/lib/inventory/service";
import { validateBpclInvoiceTotals } from "@/lib/inventory/bpcl-totals";
import {
  allocateInvoiceDiscount,
  computeLandingPrice,
  invoiceDiscountPerPacket,
  invoiceRoundingPerPacket,
} from "@/lib/inventory/landing-price";
import { bpclInvoiceExists } from "@/lib/queries/bpcl-invoice";
import {
  buildReceiveReferenceNote,
  formatBoxCount,
  formatPacketCount,
  getPacketsPerBox,
  hasBoxPackaging,
  litresFromBoxes,
  totalPacketsFromBoxes,
} from "@/lib/packaging";
import type { OilProduct } from "@/lib/db/schema";

const transactionSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referenceNote: z.string().optional(),
});

export type ActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

function parsePackageCount(formData: FormData): number | null {
  const raw = formData.get("packageCount");
  const count = Number(raw);
  if (!raw || !Number.isInteger(count) || count < 1) {
    return null;
  }
  return count;
}

function buildReferenceNote(packageCount: number, userNote: string) {
  return [`Packages: ${packageCount}`, userNote || null].filter(Boolean).join("\n");
}

async function getProductById(tenantId: string, productId: string) {
  const db = getDb();
  const [product] = await db
    .select()
    .from(oilProducts)
    .where(and(eq(oilProducts.id, productId), eq(oilProducts.tenantId, tenantId)))
    .limit(1);
  return product ?? null;
}

function boxToastMessage(boxCount: number, product: Awaited<ReturnType<typeof getProductById>>) {
  if (product) {
    const totalPackets = totalPacketsFromBoxes(boxCount, product);
    if (totalPackets != null) {
      return `${formatPacketCount(totalPackets)} (${formatBoxCount(boxCount)})`;
    }
  }
  return formatBoxCount(boxCount);
}

const bpclHeaderSchema = z.object({
  invoice: z.string().trim().min(1, "Invoice number is required."),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required."),
  additionalDiscount: z.coerce.number().nonnegative().default(0),
  totalCgst: z.coerce.number().nonnegative().default(0),
  totalSgst: z.coerce.number().nonnegative().default(0),
  roundingOff: z.coerce.number().default(0),
  totalAmount: z.coerce.number().positive("Total amount is required."),
});

const bpclLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  returned: z.coerce.number().int().nonnegative().default(0),
  taxableValue: z.coerce.number().nonnegative(),
  cgstAmount: z.coerce.number().nonnegative(),
  sgstAmount: z.coerce.number().nonnegative(),
  discountAmount: z.coerce.number().nonnegative().default(0),
});

type BpclLineInput = z.infer<typeof bpclLineSchema>;
type BpclHeaderInput = z.infer<typeof bpclHeaderSchema>;

function resolveBpclBatchLines(
  lines: BpclLineInput[],
  productById: Map<string, OilProduct>,
  header: Pick<
    BpclHeaderInput,
    | "additionalDiscount"
    | "totalCgst"
    | "totalSgst"
    | "roundingOff"
    | "totalAmount"
  >
): { ok: true; batchLines: BpclReceiveLineInput[] } | { ok: false; error: string } {
  const {
    additionalDiscount,
    totalCgst,
    totalSgst,
    roundingOff,
    totalAmount,
  } = header;
  let totalInvoicePackets = 0;
  const resolved: Array<{
    line: BpclLineInput;
    product: OilProduct;
    packetsPerBox: number;
    litres: number;
    invoiceLinePackets: number;
    goodCases: number;
  }> = [];

  for (const line of lines) {
    const product = productById.get(line.productId);
    if (!product || !product.isActive) {
      return { ok: false, error: "One or more products are inactive or missing." };
    }
    if (!hasBoxPackaging(product)) {
      return {
        ok: false,
        error: `${product.name} is missing case packaging. Update the product first.`,
      };
    }
    if (line.returned > line.quantity) {
      return {
        ok: false,
        error: `${product.name}: returned cases cannot exceed quantity.`,
      };
    }
    const goodCases = line.quantity - line.returned;
    if (goodCases < 1) {
      return {
        ok: false,
        error: `${product.name}: at least one good case is required after returned.`,
      };
    }
    const packetsPerBox = getPacketsPerBox(product);
    if (packetsPerBox == null) {
      return {
        ok: false,
        error: `${product.name} is missing pieces per case.`,
      };
    }
    const litres = litresFromBoxes(goodCases, product);
    if (litres == null) {
      return {
        ok: false,
        error: `Could not compute volume for ${product.name}.`,
      };
    }
    // Landing / invoice discount use full billed qty (incl. returned).
    const invoiceLinePackets = line.quantity * packetsPerBox;
    totalInvoicePackets += invoiceLinePackets;
    resolved.push({
      line,
      product,
      packetsPerBox,
      litres,
      invoiceLinePackets,
      goodCases,
    });
  }

  const totalsCheck = validateBpclInvoiceTotals({
    lines: resolved.map(({ line }) => ({
      taxableValue: line.taxableValue,
      discountAmount: line.discountAmount,
      cgstAmount: line.cgstAmount,
      sgstAmount: line.sgstAmount,
    })),
    additionalDiscount,
    totalCgst,
    totalSgst,
    roundingOff,
    totalAmount,
  });
  if (!totalsCheck.ok) {
    return { ok: false, error: totalsCheck.error };
  }

  const perPacketInvoiceDiscount = invoiceDiscountPerPacket(
    additionalDiscount,
    totalInvoicePackets
  );
  const perPacketRounding = invoiceRoundingPerPacket(
    roundingOff,
    totalInvoicePackets
  );

  const batchLines: BpclReceiveLineInput[] = [];
  for (const {
    line,
    product,
    packetsPerBox,
    litres,
    invoiceLinePackets,
    goodCases,
  } of resolved) {
    const allocatedInvoiceDiscount = allocateInvoiceDiscount(
      additionalDiscount,
      invoiceLinePackets,
      totalInvoicePackets
    );
    const discountAmount = line.discountAmount + allocatedInvoiceDiscount;
    const landingPrice = computeLandingPrice({
      taxableValue: line.taxableValue,
      discountAmount: line.discountAmount,
      cgstAmount: line.cgstAmount,
      sgstAmount: line.sgstAmount,
      boxQuantity: line.quantity,
      packetsPerBox,
      invoiceDiscountPerPacket: perPacketInvoiceDiscount,
      invoiceRoundingPerPacket: perPacketRounding,
    });
    if (landingPrice == null) {
      return {
        ok: false,
        error: `Could not compute landing price for ${product.name}.`,
      };
    }

    batchLines.push({
      productId: line.productId,
      quantityLitres: litres,
      packageCount: goodCases,
      returnedCases: line.returned,
      taxableValue: line.taxableValue,
      cgstAmount: line.cgstAmount,
      sgstAmount: line.sgstAmount,
      discountAmount,
      landingPrice,
    });
  }

  return { ok: true, batchLines };
}

async function parseBpclFormPayload(formData: FormData, tenantId: string) {
  const header = bpclHeaderSchema.safeParse({
    invoice: formData.get("invoice"),
    transactionDate: formData.get("transactionDate"),
    additionalDiscount: formData.get("additionalDiscount") || 0,
    totalCgst: formData.get("totalCgst") || 0,
    totalSgst: formData.get("totalSgst") || 0,
    roundingOff: formData.get("roundingOff") || 0,
    totalAmount: formData.get("totalAmount"),
  });
  if (!header.success) {
    return {
      ok: false as const,
      error:
        header.error.issues[0]?.message ?? "Invoice number and date are required.",
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
      error: "Enter quantity for at least one product.",
    };
  }

  const parsedLines = z.array(bpclLineSchema).safeParse(rawLines);
  if (!parsedLines.success) {
    return {
      ok: false as const,
      error:
        parsedLines.error.issues[0]?.message ?? "Please check product line values.",
    };
  }

  const db = getDb();
  const productIds = parsedLines.data.map((line) => line.productId);
  const products = await db
    .select()
    .from(oilProducts)
    .where(
      and(eq(oilProducts.tenantId, tenantId), inArray(oilProducts.id, productIds))
    );
  const productById = new Map(products.map((p) => [p.id, p] as const));
  const resolved = resolveBpclBatchLines(
    parsedLines.data,
    productById,
    header.data
  );
  if (!resolved.ok) {
    return { ok: false as const, error: resolved.error };
  }

  return {
    ok: true as const,
    header: header.data,
    batchLines: resolved.batchLines,
  };
}

export async function receiveBpclStockAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = await parseBpclFormPayload(formData, session.tenantId);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  if (await bpclInvoiceExists(session.tenantId, parsed.header.invoice)) {
    return {
      success: false,
      error: `Invoice ${parsed.header.invoice} already exists. Edit the existing invoice instead.`,
    };
  }

  try {
    await createBpclReceiveBatch({
      tenantId: session.tenantId,
      transactionDate: parsed.header.transactionDate,
      invoice: parsed.header.invoice,
      createdBy: session.userId,
      lines: parsed.batchLines,
    });
    revalidateInventoryPages();
    return {
      success: true,
      message: `${parsed.batchLines.length} product${parsed.batchLines.length === 1 ? "" : "s"} received from BPCL`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof InventoryError
          ? error.message
          : "Failed to record BPCL receipt.",
    };
  }
}

export async function updateBpclStockAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const originalInvoice = String(formData.get("originalInvoice") || "").trim();
  if (!originalInvoice) {
    return { success: false, error: "Original invoice number is required." };
  }

  const parsed = await parseBpclFormPayload(formData, session.tenantId);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  try {
    await updateBpclReceiveBatch({
      tenantId: session.tenantId,
      originalInvoice,
      transactionDate: parsed.header.transactionDate,
      invoice: parsed.header.invoice,
      createdBy: session.userId,
      lines: parsed.batchLines,
    });
    revalidateInventoryPages();
    return {
      success: true,
      message: `Invoice ${parsed.header.invoice} updated`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof InventoryError
          ? error.message
          : "Failed to update BPCL invoice.",
    };
  }
}

export async function receiveStockAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const packageCount = parsePackageCount(formData);
  if (packageCount === null) {
    return { success: false, error: "Please enter a valid package count." };
  }

  const supplier = String(formData.get("supplier") || "").trim();
  const invoice = String(formData.get("invoice") || "").trim();
  const referenceNote = buildReceiveReferenceNote({
    packageCount,
    supplier,
    invoice,
  });

  const parsed = transactionSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    transactionDate: formData.get("transactionDate"),
    referenceNote: referenceNote || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Please check all required fields." };
  }

  try {
    await createInventoryTransaction({
      ...parsed.data,
      tenantId: session.tenantId,
      type: "RECEIVE",
      createdBy: session.userId,
    });
    revalidateInventoryPages();
    const product = await getProductById(session.tenantId, parsed.data.productId);
    return {
      success: true,
      message: `${boxToastMessage(packageCount, product)} received at Depot`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof InventoryError
          ? error.message
          : "Failed to record receipt.",
    };
  }
}

export async function transferStockAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "transfer:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const packageCount = parsePackageCount(formData);
  if (packageCount === null) {
    return { success: false, error: "Please enter a valid package count." };
  }

  const userNote = String(formData.get("referenceNote") || "").trim();
  const referenceNote = buildReferenceNote(packageCount, userNote);

  const parsed = transactionSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    transactionDate: formData.get("transactionDate"),
    referenceNote: referenceNote || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Please check all required fields." };
  }

  try {
    await createInventoryTransaction({
      ...parsed.data,
      tenantId: session.tenantId,
      type: "TRANSFER",
      createdBy: session.userId,
    });
    revalidateInventoryPages();
    const product = await getProductById(session.tenantId, parsed.data.productId);
    return {
      success: true,
      message: `${boxToastMessage(packageCount, product)} transferred to Manager`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof InventoryError
          ? error.message
          : "Failed to record transfer.",
    };
  }
}

export async function recordSaleAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "sales:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const packageCount = parsePackageCount(formData);
  if (packageCount === null) {
    return { success: false, error: "Please enter a valid package count." };
  }

  const consumptionType = String(
    formData.get("consumptionType") || "SALE"
  );
  if (
    consumptionType !== "SALE" &&
    consumptionType !== "RETURNED" &&
    consumptionType !== "DAMAGED"
  ) {
    return { success: false, error: "Invalid consumption category." };
  }

  const userNote = String(formData.get("referenceNote") || "").trim();
  const referenceNote = buildReferenceNote(packageCount, userNote);

  const parsed = transactionSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    transactionDate: formData.get("transactionDate"),
    referenceNote: referenceNote || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Please check all required fields." };
  }

  if (
    consumptionType === "SALE" ||
    consumptionType === "RETURNED" ||
    consumptionType === "DAMAGED"
  ) {
    const balance = await getProductBalance(session.tenantId, parsed.data.productId, "MANAGER");
    if (balance <= 0) {
      return {
        success: false,
        error: "No stock available at Oil Manager.",
      };
    }
    if (parsed.data.quantity > balance) {
      return {
        success: false,
        error: `Only ${balance.toFixed(1)} available at Manager`,
      };
    }
  }

  try {
    await createInventoryTransaction({
      ...parsed.data,
      tenantId: session.tenantId,
      type: consumptionType as "SALE" | "RETURNED" | "DAMAGED",
      createdBy: session.userId,
    });
    revalidateInventoryPages();

    const label =
      consumptionType === "SALE"
        ? "Sale"
        : consumptionType === "RETURNED"
          ? "Returned"
          : "Damaged";

    return {
      success: true,
      message: `${label} of ${formatPacketCount(packageCount)} recorded`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof InventoryError
          ? error.message
          : "Failed to record sale.",
    };
  }
}

const markReplacedSchema = z.object({
  returnedCaseId: z.string().uuid(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required."),
  casesReplaced: z.coerce.number().int().positive(),
  notes: z.string().trim().optional(),
});

export async function markReturnedCaseReplacedAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = markReplacedSchema.safeParse({
    returnedCaseId: formData.get("returnedCaseId"),
    transactionDate: formData.get("transactionDate"),
    casesReplaced: formData.get("casesReplaced"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form values.",
    };
  }

  try {
    const result = await markReturnedCaseReplaced({
      tenantId: session.tenantId,
      returnedCaseId: parsed.data.returnedCaseId,
      transactionDate: parsed.data.transactionDate,
      casesReplaced: parsed.data.casesReplaced,
      createdBy: session.userId,
      notes: parsed.data.notes,
    });
    revalidateInventoryPages();
    return {
      success: true,
      message: result.fullyReplaced
        ? `All ${result.totalReturned} returned case${result.totalReturned === 1 ? "" : "s"} added back to invoice ${result.invoice}`
        : `Added ${parsed.data.casesReplaced} case${parsed.data.casesReplaced === 1 ? "" : "s"} to invoice ${result.invoice} (${result.totalReplaced}/${result.totalReturned}); ${result.remainingCases} still open`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof InventoryError
          ? error.message
          : "Failed to record replacement.",
    };
  }
}

export async function getDepotBalanceAction(productId: string) {
  if (!productId) return 0;
  const session = await requireTenantSession();
  return getProductBalance(session.tenantId, productId, "DEPOT");
}

export async function getManagerBalanceAction(productId: string) {
  if (!productId) return 0;
  const session = await requireTenantSession();
  return getProductBalance(session.tenantId, productId, "MANAGER");
}
