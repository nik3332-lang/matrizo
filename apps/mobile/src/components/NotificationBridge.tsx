import { useEffect } from "react";
import { AppState } from "react-native";
import { router, type Href } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth";
import { session } from "@/lib/api";
import {
  enableNotifications,
  notificationModule,
  PUSH_OWNER_KEY,
} from "@/lib/notifications";
import { orderDestination } from "@/lib/navigation";
export function NotificationBridge() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    let active = true;
    const subscriptions: { remove(): void }[] = [];
    let lastRegistration = 0;
    async function register() {
      if (!user || Date.now() - lastRegistration < 60_000) return;
      if ((await AsyncStorage.getItem(PUSH_OWNER_KEY)) !== user.id || !active)
        return;
      lastRegistration = Date.now();
      await enableNotifications(false);
    }
    void register().catch(() => {});
    const foreground = AppState.addEventListener("change", (state) => {
      if (state === "active") void register().catch(() => {});
    });
    void notificationModule()
      .then(async (notifications) => {
        if (!notifications || !active) return;
        notifications.setNotificationHandler({
          handleNotification: async () => {
            const owner = await AsyncStorage.getItem(PUSH_OWNER_KEY);
            const allowed = !!session.get() && owner === session.get()?.user.id;
            return {
              shouldShowBanner: allowed,
              shouldShowList: allowed,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          },
        });
        const open = (
          response: import("expo-notifications").NotificationResponse,
        ) => {
          const destination = orderDestination(
            response.notification.request.content.data?.orderId,
          );
          if (!destination || !active) return;
          if (session.get()) router.push(destination as Href);
          else
            router.push({ pathname: "/login", params: { next: destination } });
          void notifications.clearLastNotificationResponseAsync();
        };
        subscriptions.push(
          notifications.addNotificationResponseReceivedListener(open),
        );
        subscriptions.push(
          notifications.addPushTokenListener(() => {
            lastRegistration = 0;
            void register().catch(() => {});
          }),
        );
        const response = await notifications.getLastNotificationResponseAsync();
        if (response && active) open(response);
      })
      .catch(() => {});
    return () => {
      active = false;
      foreground.remove();
      subscriptions.forEach((s) => s.remove());
    };
  }, [user?.id, loading]);
  return null;
}
