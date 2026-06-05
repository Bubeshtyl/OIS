"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  revalidateProductPages,
  revalidateUserPages,
} from "@/lib/actions/revalidate";
import { getDb } from "@/lib/db";
import { oilProducts, users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import type { ActionState } from "@/lib/actions/inventory";

const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    unit: z.enum(["litre", "millilitre"]),
    costPrice: z.coerce.number().nonnegative(),
    sellingPrice: z.coerce.number().nonnegative(),
    lowStockThreshold: z.coerce.number().nonnegative().optional(),
    packetsPerBox: z.coerce.number().int().positive().optional(),
    volumePerPacket: z.coerce.number().positive().optional(),
    isActive: z.coerce.boolean(),
  })
  .refine(
    (data) => {
      const hasPackets = data.packetsPerBox != null;
      const hasVolume = data.volumePerPacket != null;
      return hasPackets === hasVolume;
    },
    {
      message: "Set both packets per box and volume per packet, or leave both blank.",
    }
  );

export async function saveProductAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  if (!hasPermission(session.role, "products:manage")) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = productSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    unit: formData.get("unit"),
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    lowStockThreshold: formData.get("lowStockThreshold") || undefined,
    packetsPerBox: formData.get("packetsPerBox") || undefined,
    volumePerPacket: formData.get("volumePerPacket") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Please check all required fields.",
    };
  }

  const volumePerBox =
    parsed.data.packetsPerBox && parsed.data.volumePerPacket
      ? parsed.data.packetsPerBox * parsed.data.volumePerPacket
      : null;

  const db = getDb();
  const values = {
    name: parsed.data.name,
    unit: parsed.data.unit,
    costPrice: String(parsed.data.costPrice),
    sellingPrice: String(parsed.data.sellingPrice),
    lowStockThreshold: parsed.data.lowStockThreshold
      ? String(parsed.data.lowStockThreshold)
      : null,
    packetsPerBox: parsed.data.packetsPerBox
      ? String(parsed.data.packetsPerBox)
      : null,
    volumePerPacket: parsed.data.volumePerPacket
      ? String(parsed.data.volumePerPacket)
      : null,
    volumePerBox: volumePerBox ? String(volumePerBox) : null,
    isActive: parsed.data.isActive,
  };

  if (parsed.data.id) {
    await db
      .update(oilProducts)
      .set(values)
      .where(eq(oilProducts.id, parsed.data.id));
  } else {
    await db.insert(oilProducts).values(values);
  }

  revalidateProductPages();
  return { success: true, message: "Product saved." };
}

const userSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "ACCOUNTS"]),
  password: z.string().min(6).optional(),
  isActive: z.coerce.boolean(),
});

export async function saveUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  if (!hasPermission(session.role, "users:manage")) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = userSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: "Please check all required fields." };
  }

  if (!parsed.data.id && !parsed.data.password) {
    return { success: false, error: "Password is required for new users." };
  }

  const db = getDb();

  if (parsed.data.id) {
    const update: {
      name: string;
      email: string;
      role: "ADMIN" | "MANAGER" | "ACCOUNTS";
      isActive: boolean;
      passwordHash?: string;
    } = {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    };

    if (parsed.data.password) {
      update.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    await db.update(users).set(update).where(eq(users.id, parsed.data.id));
  } else {
    await db.insert(users).values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      passwordHash: await bcrypt.hash(parsed.data.password!, 10),
    });
  }

  revalidateUserPages();
  return { success: true, message: "User saved." };
}

export async function getAllUsers() {
  const session = await requireSession();
  if (!hasPermission(session.role, "users:manage")) {
    return [];
  }

  const db = getDb();
  return db.select().from(users).orderBy(users.name);
}
