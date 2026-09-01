"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPushNotificationStatusAction,
  subscribePushNotificationAction,
  unsubscribePushNotificationAction,
} from "@/lib/actions/push-notifications";
import {
  isPushSupported,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/lib/push/client";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function PushNotificationsToggle({
  canUsePush,
}: {
  canUsePush: boolean;
}) {
  const [configured, setConfigured] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!canUsePush || !isPushSupported()) return;

    getPushNotificationStatusAction().then((res) => {
      if (!res.success || !res.data) return;
      setConfigured(res.data.configured);
      setSubscribed(res.data.subscribed);
      setPublicKey(res.data.publicKey);
    });
  }, [canUsePush]);

  if (!canUsePush || !isPushSupported() || !configured) {
    return null;
  }

  function handleToggle() {
    startTransition(async () => {
      try {
        if (subscribed) {
          const endpoint = await unsubscribeFromPushNotifications();
          if (!endpoint) {
            setSubscribed(false);
            toast.success("Push notifications disabled.");
            return;
          }
          const res = await unsubscribePushNotificationAction(endpoint);
          if (res.success) {
            setSubscribed(false);
            toast.success(res.message || "Push notifications disabled.");
          } else {
            toast.error(res.error || "Failed to disable push notifications.");
          }
          return;
        }

        if (!publicKey) {
          toast.error("Push notifications are not configured.");
          return;
        }

        const subscription = await subscribeToPushNotifications(publicKey);
        const res = await subscribePushNotificationAction(subscription);
        if (res.success) {
          setSubscribed(true);
          toast.success(res.message || "Push notifications enabled.");
        } else {
          toast.error(res.error || "Failed to enable push notifications.");
        }
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Push notification error."
        );
      }
    });
  }

  return (
    <SidebarMenuButton
      type="button"
      tooltip={subscribed ? "Disable push alerts" : "Enable push alerts"}
      className="h-10 rounded-xl"
      disabled={isPending}
      onClick={handleToggle}
    >
      {isPending ? (
        <Loader2 className="size-[1.125rem] animate-spin" />
      ) : subscribed ? (
        <Bell className="size-[1.125rem]" />
      ) : (
        <BellOff className="size-[1.125rem]" />
      )}
      <span>{subscribed ? "Push alerts on" : "Enable push alerts"}</span>
    </SidebarMenuButton>
  );
}
