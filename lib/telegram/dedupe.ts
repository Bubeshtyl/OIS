import { getDb } from "@/lib/db";
import { telegramProcessedUpdates } from "@/lib/db/schema";

export async function markUpdateProcessed(updateId: number): Promise<boolean> {
  const db = getDb();
  const inserted = await db
    .insert(telegramProcessedUpdates)
    .values({ updateId: String(updateId) })
    .onConflictDoNothing()
    .returning();
  return inserted.length > 0;
}
