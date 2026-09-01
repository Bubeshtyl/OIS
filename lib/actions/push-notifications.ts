"use server";

import {
  requireTenantSession,
} from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import {
  hasPushSubscription,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/push/service";
import {
  getVapidPublicKey,
  isPushConfigured,
} from "@/lib/push/vapid";

export type PushNotificationActionState = {
  success: boolean;
  message?: string;
  error?: string;
  subscribed?: boolean;
};

export async function getPushNotificationStatusAction() {
  try {
    const session = await requireTenantSession();
    const canUsePush = await hasPermission(session, "shift-closing:read");
    const configured = isPushConfigured();
    const subscribed =
      configured && canUsePush
        ? await hasPushSubscription(session.tenantId, session.userId)
        : false;

    return {
      success: true as const,
      data: {
        configured,
        canUsePush,
        subscribed,
        publicKey: configured ? getVapidPublicKey() : null,
      },
    };
  } catch (err: unknown) {
    console.error("getPushNotificationStatusAction error:", err);
    return {
      success: false as const,
      error:
        err instanceof Error
          ? err.message
          : "Failed to load push notification status.",
    };
  }
}

export async function subscribePushNotificationAction(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<PushNotificationActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false, error: "Permission denied." };
    }
    if (!isPushConfigured()) {
      return {
        success: false,
        error: "Push notifications are not configured on this server.",
      };
    }

    await savePushSubscription(session.tenantId, session.userId, input);
    return {
      success: true,
      subscribed: true,
      message: "Push notifications enabled.",
    };
  } catch (err: unknown) {
    console.error("subscribePushNotificationAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to enable push notifications.",
    };
  }
}

export async function unsubscribePushNotificationAction(
  endpoint: string
): Promise<PushNotificationActionState> {
  try {
    const session = await requireTenantSession();
    if (!(await hasPermission(session, "shift-closing:read"))) {
      return { success: false, error: "Permission denied." };
    }

    await removePushSubscription(
      session.tenantId,
      session.userId,
      endpoint
    );
    return {
      success: true,
      subscribed: false,
      message: "Push notifications disabled.",
    };
  } catch (err: unknown) {
    console.error("unsubscribePushNotificationAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to disable push notifications.",
    };
  }
}
