"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidateSettingsPages } from "@/lib/actions/revalidate";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { ticketSettings } from "@/lib/db/schema";
import type { ActionState } from "@/lib/actions/inventory";

const settingsSchema = z.object({
  prefix: z.string().min(1).max(20),
  paddingWidth: z.coerce.number().int().min(1).max(10),
  accessCode: z.string().optional(),
});

export async function saveTicketSettingsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();
  if (!(await hasPermission(session.role, "settings:manage"))) {
    return { success: false, error: "You do not have permission." };
  }

  const parsed = settingsSchema.safeParse({
    prefix: formData.get("prefix"),
    paddingWidth: formData.get("paddingWidth"),
    accessCode: formData.get("accessCode") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Please check all required fields." };
  }

  const values = {
    prefix: parsed.data.prefix,
    paddingWidth: parsed.data.paddingWidth,
    accessCode: parsed.data.accessCode?.trim() || null,
  };

  const db = getDb();
  await db
    .insert(ticketSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({
      target: ticketSettings.id,
      set: { ...values, updatedAt: new Date() },
    });

  revalidateSettingsPages();
  return { success: true, message: "Settings saved." };
}

export async function getTicketSettings() {
  const db = getDb();
  const [settings] = await db
    .select()
    .from(ticketSettings)
    .where(eq(ticketSettings.id, 1))
    .limit(1);
  return settings ?? { id: 1, prefix: "JCK", paddingWidth: 6, accessCode: null };
}
