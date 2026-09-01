"use server";

import {
  isSystemAdminRole,
  requireTenantSession,
} from "@/lib/auth/permissions";
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
    const isAdmin = await isSystemAdminRole(session.roleId);
    const configured = isPushConfigured();
    const subscribed =
      configured && isAdmin
        ? await hasPushSubscription(session.tenantId, session.userId)
        : false;

    return {
      success: true as const,
      data: {
        configured,
        isAdmin,
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
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only admins can enable push alerts." };
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
    if (!(await isSystemAdminRole(session.roleId))) {
      return { success: false, error: "Only admins can manage push alerts." };
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
