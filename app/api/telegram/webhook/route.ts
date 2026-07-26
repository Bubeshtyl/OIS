import { NextRequest, NextResponse } from "next/server";
import { markUpdateProcessed } from "@/lib/telegram/dedupe";
import { handleUpdate } from "@/lib/telegram/conversation";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const isNew = await markUpdateProcessed(update.update_id);
  if (!isNew) {
    return NextResponse.json({ ok: true });
  }

  try {
    await handleUpdate(update);
  } catch (error) {
    console.error("Failed to handle Telegram update", error);
  }

  return NextResponse.json({ ok: true });
}
