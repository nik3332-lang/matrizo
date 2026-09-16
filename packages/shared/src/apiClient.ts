// Minimal typed fetch wrapper shared by apps/web and apps/admin. Deliberately
// thin — just base URL + auth header + JSON parsing + a typed error, not a
// full generated client — since the route shapes are still moving. Revisit
// once they've settled.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type ApiClientConfig = {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  refreshAccessToken?: () => Promise<boolean>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createApiClient({
  baseUrl,
  getAccessToken,
  refreshAccessToken,
}: ApiClientConfig) {
  async function requestOnce<T = unknown>(
    path: string,
    init?: RequestInit,
    refreshed = false,
  ): Promise<T> {
    const token = getAccessToken?.();
    const res = await fetch(`${baseUrl}${path}`, {
      // Explicit no-store: a bare fetch() from a Next.js Server Component
      // defaults to force-cache and gets cached in Next's Data Cache —
      // this data (prices, stock, specs) should never be cached at this
      // layer regardless.
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiError(
        "The service is temporarily unavailable. Please try again.",
        res.status || 503,
      );
    }

    if (
      res.status === 401 &&
      !refreshed &&
      token &&
      refreshAccessToken &&
      (await refreshAccessToken())
    ) {
      return requestOnce<T>(path, init, true);
    }

    if (!res.ok) {
      throw new ApiError(
        (body && body.error) || `Request failed (${res.status})`,
        res.status,
      );
    }
    return body as T;
  }

  // Retries GETs a couple of times on a network-level failure (fetch
  // throwing, or a non-JSON/non-2xx response from an intermediary rather
  // than the API itself) before giving up. Hit in production: Cloudflare
  // error 1042 on Worker-to-Worker fetches between two *.workers.dev
  // subdomains (apps/web's server-rendered pages calling matrizo-api) —
  // intermittent, not a hard platform rule (the same code path worked
  // cleanly earlier the same session), consistent with the Cloudflare
  // control-plane flakiness seen all session during deploys. A GET is
  // safe to retry; writes (POST/PATCH/etc.) are deliberately not retried
  // here since a failure after the write landed shouldn't resubmit it.
  async function request<T = unknown>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const method = init?.method?.toUpperCase() ?? "GET";
    if (method !== "GET") return requestOnce<T>(path, init);

    const attempts = 3;
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await requestOnce<T>(path, init);
      } catch (err) {
        lastErr = err;
        // Don't retry a real API error response (4xx/5xx from the API
        // itself, e.g. "not found") — only network-level/transport
        // failures, which surface as something other than ApiError.
        if (err instanceof ApiError) throw err;
        if (i < attempts - 1) await delay(150 * 2 ** i);
      }
    }
    throw lastErr;
  }

  return {
    get: <T = unknown>(path: string) => request<T>(path),
    post: <T = unknown>(path: string, data?: unknown) =>
      request<T>(path, {
        method: "POST",
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    patch: <T = unknown>(path: string, data?: unknown) =>
      request<T>(path, {
        method: "PATCH",
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    put: <T = unknown>(path: string, data?: unknown) =>
      request<T>(path, {
        method: "PUT",
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    delete: <T = unknown>(path: string) =>
      request<T>(path, { method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
