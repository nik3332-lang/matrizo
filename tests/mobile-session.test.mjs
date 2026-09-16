import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionManager } from "../apps/mobile/src/lib/session-core.ts";
import {
  safeDestination,
  orderDestination,
} from "../apps/mobile/src/lib/navigation.ts";
const user = {
  id: "customer-one",
  role: "customer",
  name: "Test",
  email: null,
  phone: null,
};
const session = {
  accessToken: "old-access",
  refreshToken: "old-refresh",
  user,
};
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function memory() {
  let value = null;
  return {
    read: async () => value,
    write: async (input) => {
      value = input;
    },
    clear: async () => {
      value = null;
    },
    get: () => value,
  };
}
test("concurrent expiry responses share one refresh and persist the new credentials", async () => {
  const storage = memory(),
    response = deferred();
  let calls = 0;
  const manager = createSessionManager(
    storage,
    "https://local.test",
    async () => {
      calls++;
      return response.promise;
    },
  );
  await manager.save(session);
  const a = manager.refresh(),
    b = manager.refresh();
  assert.equal(a, b);
  response.resolve(
    Response.json({
      ...session,
      accessToken: "new-access",
      refreshToken: "new-refresh",
    }),
  );
  assert.deepEqual(await Promise.all([a, b]), [true, true]);
  assert.equal(calls, 1);
  assert.equal(JSON.parse(storage.get()).accessToken, "new-access");
});
test("a refresh completing after logout cannot restore the account", async () => {
  const storage = memory(),
    response = deferred();
  const manager = createSessionManager(
    storage,
    "https://local.test",
    () => response.promise,
  );
  await manager.save(session);
  const refresh = manager.refresh();
  await manager.clear();
  response.resolve(Response.json(session));
  assert.equal(await refresh, false);
  assert.equal(manager.get(), null);
  assert.equal(storage.get(), null);
});
test("a delayed storage hydration cannot overwrite a new login", async () => {
  const read = deferred(),
    storage = memory();
  const manager = createSessionManager(
    { ...storage, read: () => read.promise },
    "https://local.test",
  );
  const hydration = manager.hydrate();
  await manager.save(session);
  read.resolve(JSON.stringify({ ...session, user: { ...user, id: "other" } }));
  await hydration;
  assert.equal(manager.get().user.id, user.id);
});
test("a failed stale storage write cannot clear a newer session", async () => {
  const storage = memory(),
    write = deferred();
  let count = 0;
  const manager = createSessionManager(
    {
      ...storage,
      write: (value) => (++count === 1 ? write.promise : storage.write(value)),
    },
    "https://local.test",
  );
  const old = manager.save(session).catch((e) => e);
  const current = manager.save({
    ...session,
    user: { ...user, id: "new-user" },
  });
  write.reject(new Error("storage locked"));
  await old;
  await current;
  assert.equal(manager.get().user.id, "new-user");
  assert.equal(JSON.parse(storage.get()).user.id, "new-user");
});
test("invalidated refresh clears access, but a network outage preserves a saved session", async () => {
  const storage = memory();
  let offline = true;
  const manager = createSessionManager(
    storage,
    "https://local.test",
    async () => {
      if (offline) throw new Error("offline");
      return new Response(null, { status: 401 });
    },
  );
  await manager.save(session);
  assert.equal(await manager.refresh(), false);
  assert.equal(manager.get().user.id, user.id);
  offline = false;
  assert.equal(await manager.refresh(), false);
  assert.equal(manager.get(), null);
  assert.equal(storage.get(), null);
});
test("staff credentials cannot be saved as a customer session", async () => {
  const manager = createSessionManager(memory(), "https://local.test");
  await assert.rejects(
    manager.save({ ...session, user: { ...user, role: "admin" } }),
    /Invalid customer/,
  );
});
test("notification and login redirects accept only internal customer destinations", () => {
  for (const bad of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/orders/a?next=https://evil.test",
    ["/checkout"],
    "/admin",
  ])
    assert.equal(safeDestination(bad), "/account");
  assert.equal(safeDestination("/checkout"), "/checkout");
  assert.equal(safeDestination("/orders/abc-123"), "/orders/abc-123");
  assert.equal(orderDestination("abc-123"), "/orders/abc-123");
  assert.equal(orderDestination("../../account"), null);
});
