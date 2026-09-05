import { createApiClient } from '@matrizo/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8787/api/v1';
const TOKEN_KEY = 'matrizo_access_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: getStoredToken,
});

export function wsUrl(path: string): string {
  return API_BASE_URL.replace(/^http/, 'ws') + path;
}
