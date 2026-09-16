import { createApiClient } from "@matrizo/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8787/api/v1";
const TOKEN_KEY = "matrizo_employees_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  }
}

const REFRESH_KEY = TOKEN_KEY + "_refresh";
export function setRefreshToken(token: string) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(REFRESH_KEY, token);
}
let refreshing: Promise<boolean> | null = null;
function refreshAccessToken(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = window.localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (window.localStorage.getItem(REFRESH_KEY) !== refreshToken)
        return false;
      if (!res.ok) {
        if (res.status === 401) setStoredToken(null);
        return false;
      }
      const result = await res.json();
      setStoredToken(result.accessToken);
      setRefreshToken(result.refreshToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: getStoredToken,
  refreshAccessToken,
});
