"use server";

import { z } from "zod";
import { revalidateInventoryPages } from "@/lib/actions/revalidate";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { oilProducts } from "@/lib/db/schema";
import {
  createInventoryTransaction,
  getProductBalance,
  InventoryError,
  reverseTransaction,
} from "@/lib/inventory/service";
import {
  formatBoxCount,
  formatPacketCount,
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

async function getProductById(productId: string) {
  const db = getDb();
  const [product] = await db
    .select()
    .from(oilProducts)
    .where(eq(oilProducts.id, productId))
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

export async function receiveStockAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  if (!hasPermission(session.role, "receive:write")) {
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
      type: "RECEIVE",
      createdBy: session.userId,
    });
    revalidateInventoryPages();
    const product = await getProductById(parsed.data.productId);
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
  const session = await requireSession();
  if (!hasPermission(session.role, "transfer:write")) {
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
      type: "TRANSFER",
      createdBy: session.userId,
    });
    revalidateInventoryPages();
    const product = await getProductById(parsed.data.productId);
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
  const session = await requireSession();
  if (!hasPermission(session.role, "sales:write")) {
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
      type: "SALE",
      createdBy: session.userId,
    });
    revalidateInventoryPages();
    return {
      success: true,
      message: `Sale of ${formatPacketCount(packageCount)} recorded`,
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
  return getProductBalance(productId, "DEPOT");
}

export async function getManagerBalanceAction(productId: string) {
  if (!productId) return 0;
  return getProductBalance(productId, "MANAGER");
}

export async function reverseTransactionAction(
  transactionId: string
): Promise<ActionState> {
  const session = await requireSession();
  if (!hasPermission(session.role, "reversal:write")) {
    return { success: false, error: "Only admins can reverse transactions." };
  }

  try {
    await reverseTransaction(transactionId, session.userId);
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
