import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { telegramSessions, type TelegramSession } from "@/lib/db/schema";

export const STALE_MINUTES = 30;

export async function getSession(
  chatId: string
): Promise<TelegramSession | null> {
  const db = getDb();
  const [session] = await db
    .select()
    .from(telegramSessions)
    .where(eq(telegramSessions.chatId, chatId))
    .limit(1);
  return session ?? null;
}

export async function upsertSession(
  chatId: string,
  patch: Partial<Omit<TelegramSession, "chatId" | "createdAt">>
): Promise<TelegramSession> {
  const db = getDb();
  const existing = await getSession(chatId);

  if (existing) {
    const [updated] = await db
      .update(telegramSessions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(telegramSessions.chatId, chatId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(telegramSessions)
    .values({
      chatId,
      step: "AWAITING_TEAM",
      telegramUserId: "",
      ...patch,
    })
    .returning();
  return created;
}

export async function deleteSession(chatId: string): Promise<void> {
  const db = getDb();
  await db.delete(telegramSessions).where(eq(telegramSessions.chatId, chatId));
}

export function isSessionStale(session: TelegramSession): boolean {
  const staleMs = STALE_MINUTES * 60 * 1000;
  return Date.now() - new Date(session.updatedAt).getTime() > staleMs;
}
