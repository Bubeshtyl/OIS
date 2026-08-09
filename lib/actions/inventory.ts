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
  reverseTransaction,
} from "@/lib/inventory/service";
import {
  allocateInvoiceDiscount,
  computeLandingPrice,
  invoiceDiscountPerPacket,
} from "@/lib/inventory/landing-price";
import {
  buildReceiveReferenceNote,
  formatBoxCount,
  formatPacketCount,
  getPacketsPerBox,
  hasBoxPackaging,
  litresFromBoxes,
  totalPacketsFromBoxes,
} from "@/lib/packaging";

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
});

const bpclLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  taxableValue: z.coerce.number().nonnegative(),
  cgstAmount: z.coerce.number().nonnegative(),
  sgstAmount: z.coerce.number().nonnegative(),
  discountAmount: z.coerce.number().nonnegative().default(0),
});

export async function receiveBpclStockAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    return { success: false, error: "You do not have permission." };
  }

  const header = bpclHeaderSchema.safeParse({
    invoice: formData.get("invoice"),
    transactionDate: formData.get("transactionDate"),
    additionalDiscount: formData.get("additionalDiscount") || 0,
  });
  if (!header.success) {
    return {
      success: false,
      error: header.error.issues[0]?.message ?? "Invoice number and date are required.",
    };
  }

  let rawLines: unknown;
  try {
    rawLines = JSON.parse(String(formData.get("lines") || "[]"));
  } catch {
    return { success: false, error: "Invalid product lines." };
  }

  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return { success: false, error: "Enter quantity for at least one product." };
  }

  const parsedLines = z.array(bpclLineSchema).safeParse(rawLines);
  if (!parsedLines.success) {
    return {
      success: false,
      error: parsedLines.error.issues[0]?.message ?? "Please check product line values.",
    };
  }

  const db = getDb();
  const productIds = parsedLines.data.map((line) => line.productId);
  const products = await db
    .select()
    .from(oilProducts)
    .where(
      and(
        eq(oilProducts.tenantId, session.tenantId),
        inArray(oilProducts.id, productIds)
      )
    );

  const productById = new Map(products.map((p) => [p.id, p] as const));

  let totalPackets = 0;
  const resolved = [];
  for (const line of parsedLines.data) {
    const product = productById.get(line.productId);
    if (!product || !product.isActive) {
      return { success: false, error: "One or more products are inactive or missing." };
    }
    if (!hasBoxPackaging(product)) {
      return {
        success: false,
        error: `${product.name} is missing box packaging. Update the product first.`,
      };
    }
    const packetsPerBox = getPacketsPerBox(product);
    if (packetsPerBox == null) {
      return {
        success: false,
        error: `${product.name} is missing packets per box.`,
      };
    }
    const litres = litresFromBoxes(line.quantity, product);
    if (litres == null) {
      return {
        success: false,
        error: `Could not compute volume for ${product.name}.`,
      };
    }
    const linePackets = line.quantity * packetsPerBox;
    totalPackets += linePackets;
    resolved.push({ line, product, packetsPerBox, litres, linePackets });
  }

  const perPacketInvoiceDiscount = invoiceDiscountPerPacket(
    header.data.additionalDiscount,
    totalPackets
  );

  const batchLines = [];
  for (const { line, product, packetsPerBox, litres, linePackets } of resolved) {
    const allocatedInvoiceDiscount = allocateInvoiceDiscount(
      header.data.additionalDiscount,
      linePackets,
      totalPackets
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
    });
    if (landingPrice == null) {
      return {
        success: false,
        error: `Could not compute landing price for ${product.name}.`,
      };
    }

    batchLines.push({
      productId: line.productId,
      quantityLitres: litres,
      packageCount: line.quantity,
      taxableValue: line.taxableValue,
      cgstAmount: line.cgstAmount,
      sgstAmount: line.sgstAmount,
      discountAmount,
      landingPrice,
    });
  }

  try {
    await createBpclReceiveBatch({
      tenantId: session.tenantId,
      transactionDate: header.data.transactionDate,
      invoice: header.data.invoice,
      createdBy: session.userId,
      lines: batchLines,
    });
    revalidateInventoryPages();
    return {
      success: true,
      message: `${batchLines.length} product${batchLines.length === 1 ? "" : "s"} received from BPCL`,
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

export async function reverseTransactionAction(
  transactionId: string
): Promise<ActionState> {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "reversal:write"))) {
    return { success: false, error: "Only admins can reverse transactions." };
  }

  try {
    await reverseTransaction(session.tenantId, transactionId, session.userId);
    revalidateInventoryPages();
    return { success: true, message: "Transaction reversed successfully." };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof InventoryError
          ? error.message
          : "Failed to reverse transaction.",
    };
  }
}
