import { hasPushSubscription } from "@/lib/push/service";
import {
  getVapidPublicKey,
  isPushConfigured,
} from "@/lib/push/vapid";

export type PushNotificationStatus = {
  configured: boolean;
  subscribed: boolean;
  publicKey: string | null;
};

export async function getPushNotificationStatus(
  tenantId: string,
  userId: string
): Promise<PushNotificationStatus> {
  const configured = isPushConfigured();
  const subscribed = configured
    ? await hasPushSubscription(tenantId, userId)
    : false;

  return {
    configured,
    subscribed,
    publicKey: configured ? getVapidPublicKey() : null,
  };
}
