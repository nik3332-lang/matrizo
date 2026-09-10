import AsyncStorage from '@react-native-async-storage/async-storage';

import { createApiClient } from '@matrizo/shared';

// Same env-driven base URL pattern as apps/web (see apps/web/src/lib/api.ts),
// via EXPO_PUBLIC_* which Expo inlines at build time the same way Next.js
// inlines NEXT_PUBLIC_*.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8787/api/v1';
const TOKEN_KEY = 'matrizo_access_token';

// createApiClient needs a *synchronous* token getter, but AsyncStorage is
// async — so the token is cached in memory here, hydrated once at startup
// (see AuthProvider) and kept in sync on every write.
let cachedToken: string | null = null;

export async function hydrateStoredToken(): Promise<string | null> {
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export function getStoredToken(): string | null {
  return cachedToken;
}

export async function setStoredToken(token: string | null) {
  cachedToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: getStoredToken,
});

export function wsUrl(path: string): string {
  return API_BASE_URL.replace(/^http/, 'ws') + path;
}
