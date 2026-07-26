import type { InlineKeyboardMarkup } from "@/lib/telegram/types";

function apiBase() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return `https://api.telegram.org/bot${token}`;
}

async function callTelegram(method: string, body: Record<string, unknown>) {
  try {
    const response = await fetch(`${apiBase()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`Telegram API ${method} failed: ${response.status} ${text}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Telegram API ${method} threw:`, error);
    return null;
  }
}

export async function sendMessage(
  chatId: string,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<boolean> {
  const result = await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });
  return result !== null;
}

export async function editMessageReplyMarkup(
  chatId: string,
  messageId: number,
  replyMarkup: InlineKeyboardMarkup
): Promise<boolean> {
  const result = await callTelegram("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
  return result !== null;
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function setWebhook(
  url: string,
  secretToken: string
): Promise<unknown> {
  return callTelegram("setWebhook", { url, secret_token: secretToken });
}

export async function deleteWebhook(): Promise<unknown> {
  return callTelegram("deleteWebhook", {});
}

export async function getWebhookInfo(): Promise<unknown> {
  try {
    const response = await fetch(`${apiBase()}/getWebhookInfo`);
    return await response.json();
  } catch (error) {
    console.error("Telegram API getWebhookInfo threw:", error);
    return null;
  }
}
