import { config } from "dotenv";
import { deleteWebhook, getWebhookInfo, setWebhook } from "../lib/telegram/client";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const shouldDelete = process.argv.includes("--delete");

  if (shouldDelete) {
    await deleteWebhook();
    console.log("Webhook deleted.");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set");
  }
  if (!secret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is not set");
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
  await setWebhook(webhookUrl, secret);

  const info = await getWebhookInfo();
  console.log("Webhook info:", JSON.stringify(info, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
