import { and, eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { getDb } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import {
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  isPushConfigured,
} from "@/lib/push/vapid";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function savePushSubscription(
  tenantId: string,
  userId: string,
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
) {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .insert(pushSubscriptions)
    .values({
      tenantId,
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        tenantId,
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updatedAt: now,
      },
    })
    .returning();

  return row;
}

export async function removePushSubscription(
  tenantId: string,
  userId: string,
  endpoint: string
) {
  const db = getDb();
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );
}

export async function hasPushSubscription(
  tenantId: string,
  userId: string
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        eq(pushSubscriptions.userId, userId)
      )
    )
    .limit(1);

  return Boolean(row);
}

async function sendToSubscription(
  subscription: typeof pushSubscriptions.$inferSelect,
  payload: PushPayload
) {
  if (!ensureVapidConfigured()) return false;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error: unknown) {
    const statusCode =
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      typeof (error as { statusCode: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : null;

    if (statusCode === 404 || statusCode === 410) {
      const db = getDb();
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, subscription.id));
    } else {
      console.error("Push notification failed:", error);
    }
    return false;
  }
}

export async function sendPushToUsers(
  tenantId: string,
  userIds: string[],
  payload: PushPayload
) {
  if (!isPushConfigured() || userIds.length === 0) return { sent: 0, failed: 0 };

  const db = getDb();
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        inArray(pushSubscriptions.userId, userIds)
      )
    );

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const ok = await sendToSubscription(subscription, payload);
      if (ok) sent += 1;
      else failed += 1;
    })
  );

  return { sent, failed };
}
