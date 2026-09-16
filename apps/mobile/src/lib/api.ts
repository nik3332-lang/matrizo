import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createApiClient } from "@matrizo/shared";
import { createSessionManager } from "./session-core";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://matrizo-api.nikhilsinghal-official.workers.dev/api/v1";
const SESSION_KEY = "matrizo.customer.session.v2";
const storage = {
  read: async () =>
    Platform.OS === "web"
      ? typeof window === "undefined"
        ? null
        : window.sessionStorage.getItem(SESSION_KEY)
      : SecureStore.getItemAsync(SESSION_KEY),
  write: async (value: string) => {
    if (Platform.OS === "web")
      window.sessionStorage.setItem(SESSION_KEY, value);
    else
      await SecureStore.setItemAsync(SESSION_KEY, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
  },
  clear: async () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined")
        window.sessionStorage.removeItem(SESSION_KEY);
    } else await SecureStore.deleteItemAsync(SESSION_KEY);
    // Remove legacy unencrypted access tokens from earlier development builds.
    await AsyncStorage.removeItem("matrizo_access_token");
  },
};
export const session = createSessionManager(storage, API_BASE_URL);
export const getStoredToken = () => session.get()?.accessToken ?? null;
export const api = createApiClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 20000,
  getAccessToken: getStoredToken,
  getSessionIdentity: () => session.get()?.user.id ?? null,
  refreshAccessToken: () => session.refresh(),
});
export const authApi = createApiClient({
  baseUrl: API_BASE_URL,
  timeoutMs: 20000,
});
export const wsUrl = (path: string) =>
  API_BASE_URL.replace(/^http/, "ws") + path;
