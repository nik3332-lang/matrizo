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
};

export function createApiClient({ baseUrl, getAccessToken }: ApiClientConfig) {
  async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const token = getAccessToken?.();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

    const text = await res.text();
    const body = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new ApiError((body && body.error) || `Request failed (${res.status})`, res.status);
    }
    return body as T;
  }

  return {
    get: <T = unknown>(path: string) => request<T>(path),
    post: <T = unknown>(path: string, data?: unknown) =>
      request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
    patch: <T = unknown>(path: string, data?: unknown) =>
      request<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
    put: <T = unknown>(path: string, data?: unknown) =>
      request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
    delete: <T = unknown>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
