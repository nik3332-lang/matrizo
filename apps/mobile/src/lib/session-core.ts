export type CustomerUser = {
  id: string;
  role: "customer";
  name: string | null;
  email: string | null;
  phone: string | null;
};
export type CustomerSession = {
  accessToken: string;
  refreshToken: string;
  user: CustomerUser;
};
export type SessionStorage = {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
};

// Storage is injected so session races can be tested without a native device.
export function createSessionManager(
  storage: SessionStorage,
  baseUrl: string,
  send: typeof fetch = fetch,
) {
  let current: CustomerSession | null = null;
  let revision = 0;
  let refreshing: Promise<boolean> | null = null;
  let writes: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const persist = (action: () => Promise<void>) => {
    writes = writes.catch(() => {}).then(action);
    return writes;
  };
  async function clear() {
    revision++;
    current = null;
    notify();
    await persist(() => storage.clear());
  }
  async function save(session: CustomerSession) {
    if (
      session.user.role !== "customer" ||
      !session.accessToken ||
      !session.refreshToken
    )
      throw new Error("Invalid customer session");
    const savedRevision = ++revision;
    current = session;
    notify();
    try {
      await persist(() => storage.write(JSON.stringify(session)));
    } catch {
      if (revision === savedRevision) await clear();
      throw new Error(
        "Your device couldn’t save this session. Please try signing in again.",
      );
    }
  }
  return {
    get: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async hydrate() {
      const before = revision;
      let raw: string | null;
      try {
        raw = await storage.read();
      } catch {
        return;
      }
      if (before !== revision || !raw) return;
      try {
        const value = JSON.parse(raw) as CustomerSession;
        if (
          typeof value.accessToken !== "string" ||
          !value.accessToken ||
          typeof value.refreshToken !== "string" ||
          !value.refreshToken ||
          value.user?.role !== "customer" ||
          typeof value.user.id !== "string"
        )
          throw new Error("Invalid session");
        current = value;
        notify();
      } catch {
        await clear();
      }
    },
    save,
    clear,
    refresh(): Promise<boolean> {
      if (refreshing) return refreshing;
      const before = revision;
      const session = current;
      if (!session) return Promise.resolve(false);
      refreshing = (async () => {
        try {
          const response = await send(`${baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: session.refreshToken }),
            signal: AbortSignal.timeout(15_000),
          });
          if (before !== revision) return false;
          if (!response.ok) {
            if (response.status === 401) await clear();
            return false;
          }
          const result = (await response.json()) as CustomerSession;
          if (
            before !== revision ||
            result.user?.id !== session.user.id ||
            result.user.role !== "customer"
          )
            return false;
          await save(result);
          return true;
        } catch {
          return false;
        }
      })().finally(() => {
        refreshing = null;
      });
      return refreshing;
    },
  };
}
