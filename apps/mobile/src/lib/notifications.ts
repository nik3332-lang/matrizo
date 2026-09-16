import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, session } from "./api";
export const PUSH_OWNER_KEY = "matrizo.push.owner";
export const PUSH_TOKEN_KEY = "matrizo.push.token";
export async function notificationModule() {
  if (
    Platform.OS === "web" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  )
    return null;
  return import("expo-notifications");
}
async function registerNotifications(askPermission = true) {
  const owner = session.get()?.user.id;
  if (!owner) throw new Error("Sign in to enable order notifications.");
  if (!Device.isDevice || Platform.OS === "web")
    throw new Error(
      "Order notifications work on an Android phone or iPhone with the Matrizo app installed.",
    );
  const notifications = await notificationModule();
  if (!notifications)
    throw new Error(
      "Install the Matrizo development or release build to enable notifications.",
    );
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  if (!projectId)
    throw new Error(
      "Order notifications will be available once the app’s release setup is complete.",
    );
  const available = await api.get<{ available: boolean }>(
    "/account/notifications",
  );
  if (!available.available)
    throw new Error(
      "Order notifications are not available yet. You can follow progress in Your orders.",
    );
  if (Platform.OS === "android")
    await notifications.setNotificationChannelAsync("orders", {
      name: "Order updates",
      importance: notifications.AndroidImportance.DEFAULT,
    });
  let permission = await notifications.getPermissionsAsync();
  if (permission.status !== "granted" && askPermission)
    permission = await notifications.requestPermissionsAsync();
  if (permission.status !== "granted") {
    if (!askPermission) await unregisterNotifications();
    throw new Error(
      "Allow notifications in your phone’s Settings to receive order updates.",
    );
  }
  const token = (await notifications.getExpoPushTokenAsync({ projectId })).data;
  if (session.get()?.user.id !== owner) return;
  const old = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (session.get()?.user.id !== owner) return;
  await api.post("/account/notifications/device", {
    token,
    platform: Platform.OS,
  });
  if (session.get()?.user.id !== owner) return;
  await AsyncStorage.multiSet([
    [PUSH_TOKEN_KEY, token],
    [PUSH_OWNER_KEY, owner],
  ]);
  if (old && old !== token)
    await api.post("/account/notifications/unregister", { token: old });
}
async function unregisterNotifications() {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (token) await api.post("/account/notifications/unregister", { token });
  await AsyncStorage.multiRemove([PUSH_TOKEN_KEY, PUSH_OWNER_KEY]);
}

// Serialize registration and sign-out so a late foreground registration cannot
// recreate a device subscription after the user has turned notifications off.
let pending: Promise<unknown> = Promise.resolve();
function serialize(action: () => Promise<void>) {
  const result = pending.catch(() => {}).then(action);
  pending = result;
  return result;
}
export function enableNotifications(askPermission = true) {
  return serialize(() => registerNotifications(askPermission));
}
export function disableNotifications() {
  return serialize(unregisterNotifications);
}

// When an expired session is replaced by another account, its credentials may
// no longer be usable for server-side unregistration. Disable OS delivery before
// saving the new account so a shared phone does not receive the previous user's updates.
export function prepareNotificationAccount(nextOwner: string) {
  return serialize(async () => {
    const previousOwner = await AsyncStorage.getItem(PUSH_OWNER_KEY);
    if (!previousOwner || previousOwner === nextOwner) return;
    const notifications = await notificationModule();
    if (notifications) {
      await notifications.unregisterForNotificationsAsync();
      await notifications.dismissAllNotificationsAsync();
      await notifications.clearLastNotificationResponseAsync();
    }
    await AsyncStorage.multiRemove([PUSH_TOKEN_KEY, PUSH_OWNER_KEY]);
  });
}
