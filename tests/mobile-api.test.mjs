import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { startFixture, TEST_PASSWORD } from "../scripts/local-platform.mjs";
import { processPushNotifications } from "../apps/api/src/lib/pushNotifications.ts";
import { finalizeAccountDeletions } from "../apps/api/src/lib/accountDeletion.ts";
let fixture,
  serial = 0;
before(async () => {
  fixture = await startFixture();
});
after(async () => {
  await fixture?.mf.dispose();
});
async function request(
  path,
  token,
  body,
  status = 200,
  method = body ? "POST" : "GET",
) {
  const response = await fixture.mf.dispatchFetch(
    "http://localhost/api/v1" + path,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  const result = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(result)}`);
  return result;
}
async function customer() {
  const n = ++serial;
  return request(
    "/auth/customer-register",
    null,
    {
      name: "Mobile Test",
      phone: String(9700000000 + n),
      email: `mobile-${n}@matrizo.test`,
      password: TEST_PASSWORD,
    },
    201,
  );
}
async function address(customer) {
  return (
    await request(
      "/account/addresses",
      customer.accessToken,
      {
        line1: "42 Test Lane",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
        isDefault: true,
      },
      201,
    )
  ).address.id;
}
async function order(customer) {
  const addressId = await address(customer);
  await request("/cart/items", customer.accessToken, {
    productId: "pipe",
    quantity: 1,
  });
  return request(
    "/orders",
    customer.accessToken,
    { addressId, checkoutKey: randomUUID() },
    201,
  );
}
const env = () => ({
  DB: fixture.db,
  PUSH_NOTIFICATIONS_ENABLED: "true",
  EXPO_ACCESS_TOKEN: "test-expo-only",
});
async function device(customer, token) {
  const now = Math.floor(Date.now() / 1000) - 5;
  await fixture.db
    .prepare(
      "INSERT INTO push_devices(token,user_id,session_version,platform,created_at,updated_at) VALUES (?,?,0,'ios',?,?)",
    )
    .bind(token, customer.user.id, now, now)
    .run();
}
async function cleanJobs() {
  await fixture.db.prepare("DELETE FROM push_devices").run();
}
test("checkout retries and simultaneous requests reserve stock once and recover by owner only", async () => {
  const buyer = await customer(),
    other = await customer(),
    addressId = await address(buyer),
    key = randomUUID();
  const before = await fixture.db
    .prepare("SELECT stock_qty FROM inventory WHERE product_id='pipe'")
    .first("stock_qty");
  await request("/cart/items", buyer.accessToken, {
    productId: "pipe",
    quantity: 2,
  });
  const results = await Promise.all(
    [1, 2].map(() =>
      request(
        "/orders",
        buyer.accessToken,
        { addressId, checkoutKey: key },
        201,
      ),
    ),
  );
  assert.equal(results[0].orderId, results[1].orderId);
  const again = await request(
    "/orders",
    buyer.accessToken,
    { addressId, checkoutKey: key },
    201,
  );
  assert.equal(again.orderId, results[0].orderId);
  assert.equal(
    await fixture.db
      .prepare("SELECT stock_qty FROM inventory WHERE product_id='pipe'")
      .first("stock_qty"),
    before - 2,
  );
  assert.equal(
    (await request(`/orders/checkout/${key}`, buyer.accessToken)).orderId,
    again.orderId,
  );
  assert.equal(
    (await request(`/orders/checkout/${key}`, other.accessToken)).orderId,
    null,
  );
});
test("simultaneous cart additions are atomic; quantities and address defaults are bounded", async () => {
  const buyer = await customer();
  await Promise.all(
    [1, 2, 3].map(() =>
      request("/cart/items", buyer.accessToken, {
        productId: "tap",
        quantity: 1,
      }),
    ),
  );
  assert.equal(
    (await request("/cart", buyer.accessToken)).items[0].quantity,
    3,
  );
  await request(
    "/cart/items",
    buyer.accessToken,
    { productId: "tap", quantity: 9999 },
    409,
  );
  await request(
    "/cart/items/tap",
    buyer.accessToken,
    { quantity: 10000 },
    400,
    "PATCH",
  );
  await Promise.all([address(buyer), address(buyer)]);
  assert.equal(
    (await request("/account/addresses", buyer.accessToken)).addresses.filter(
      (a) => a.isDefault,
    ).length,
    1,
  );
});
test("deletion requires customer role, password and confirmation; removes personal information and invalidates sessions", async () => {
  const buyer = await customer();
  await address(buyer);
  await request("/cart/items", buyer.accessToken, {
    productId: "tap",
    quantity: 1,
  });
  await request(
    "/account/deletion",
    await fixture.sign("admin-test", "admin"),
    { password: TEST_PASSWORD, confirmation: "DELETE" },
    403,
  );
  await request(
    "/account/deletion",
    buyer.accessToken,
    { password: "wrong", confirmation: "DELETE" },
    403,
  );
  await request(
    "/account/deletion",
    buyer.accessToken,
    { password: TEST_PASSWORD, confirmation: "delete" },
    400,
  );
  const deleted = await request("/account/deletion", buyer.accessToken, {
    password: TEST_PASSWORD,
    confirmation: "DELETE",
  });
  assert.equal(deleted.status, "deleted");
  const row = await fixture.db
    .prepare("SELECT * FROM users WHERE id=?")
    .bind(buyer.user.id)
    .first();
  for (const key of ["email", "phone", "password_hash"])
    assert.equal(row[key], null);
  assert.ok(row.deleted_at);
  assert.equal(row.active, 0);
  assert.equal(
    await fixture.db
      .prepare("SELECT count(*) n FROM addresses WHERE user_id=?")
      .bind(buyer.user.id)
      .first("n"),
    0,
  );
  assert.equal(
    await fixture.db
      .prepare("SELECT count(*) n FROM cart_items WHERE user_id=?")
      .bind(buyer.user.id)
      .first("n"),
    0,
  );
  await request("/account/me", buyer.accessToken, null, 401);
  await request(
    "/auth/refresh",
    null,
    { refreshToken: buyer.refreshToken },
    401,
  );
});
test("open-order deletion retains only required delivery contact until the order closes", async () => {
  const buyer = await customer(),
    placed = await order(buyer);
  const deleted = await request("/account/deletion", buyer.accessToken, {
    password: TEST_PASSWORD,
    confirmation: "DELETE",
  });
  assert.equal(deleted.status, "pending_delivery");
  let row = await fixture.db
    .prepare("SELECT email,deleted_at FROM users WHERE id=?")
    .bind(buyer.user.id)
    .first();
  assert.ok(row.email);
  assert.equal(row.deleted_at, null);
  await request(
    `/orders/${placed.orderId}/status`,
    await fixture.sign("admin-test", "admin"),
    { status: "cancelled" },
    200,
    "PATCH",
  );
  await finalizeAccountDeletions(env());
  row = await fixture.db
    .prepare("SELECT email,deleted_at FROM users WHERE id=?")
    .bind(buyer.user.id)
    .first();
  assert.equal(row.email, null);
  assert.ok(row.deleted_at);
  const saved = await fixture.db
    .prepare("SELECT * FROM addresses WHERE user_id=?")
    .bind(buyer.user.id)
    .first();
  assert.equal(saved.line1, "[removed]");
  assert.equal(saved.pincode, "000000");
  assert.equal(
    await fixture.db
      .prepare("SELECT count(*) n FROM order_items WHERE order_id=?")
      .bind(placed.orderId)
      .first("n"),
    1,
  );
});
test("notification configuration is fail-closed, and customers cannot unregister another device", async () => {
  const a = await customer(),
    b = await customer(),
    token = "ExpoPushToken[test-ownership-token]";
  assert.equal(
    (await request("/account/notifications", a.accessToken)).available,
    false,
  );
  await request(
    "/account/notifications/device",
    a.accessToken,
    { token, platform: "ios" },
    503,
  );
  await device(a, token);
  await request("/account/notifications/unregister", b.accessToken, { token });
  assert.ok(
    await fixture.db
      .prepare("SELECT token FROM push_devices WHERE token=?")
      .bind(token)
      .first(),
  );
  await request("/account/notifications/unregister", a.accessToken, { token });
  assert.equal(
    await fixture.db
      .prepare("SELECT token FROM push_devices WHERE token=?")
      .bind(token)
      .first(),
    null,
  );
});
test("push jobs are deduplicated across workers and receipt outages never resend accepted messages", async () => {
  await cleanJobs();
  const buyer = await customer(),
    token = "ExpoPushToken[test-deduplication]";
  await device(buyer, token);
  await order(buyer);
  let sent = 0,
    receiptFails = true;
  const send = async (url, init) => {
    assert.equal(init.headers.Authorization, "Bearer test-expo-only");
    if (url.endsWith("/send")) {
      sent++;
      const payload = JSON.parse(init.body);
      assert.equal(payload.to, token);
      assert.ok(payload.data.orderId);
      assert.equal(payload.data.email, undefined);
      return Response.json({ data: { status: "ok", id: "ticket-one" } });
    }
    return receiptFails
      ? Response.json({}, { status: 503 })
      : Response.json({ data: { "ticket-one": { status: "ok" } } });
  };
  await Promise.all([
    processPushNotifications(env(), send),
    processPushNotifications(env(), send),
  ]);
  assert.equal(sent, 1);
  await fixture.db.prepare("UPDATE push_jobs SET next_attempt_at=0").run();
  await processPushNotifications(env(), send);
  assert.equal(sent, 1);
  assert.equal(
    await fixture.db
      .prepare("SELECT state FROM push_jobs WHERE token=?")
      .bind(token)
      .first("state"),
    "receipt",
  );
  receiptFails = false;
  await fixture.db.prepare("UPDATE push_jobs SET next_attempt_at=0").run();
  await processPushNotifications(env(), send);
  assert.equal(sent, 1);
  assert.equal(
    await fixture.db
      .prepare("SELECT state FROM push_jobs WHERE token=?")
      .bind(token)
      .first("state"),
    "delivered",
  );
});
test("push transport failures retry; invalid devices and password-invalidated sessions are pruned", async () => {
  await cleanJobs();
  const buyer = await customer(),
    token = "ExpoPushToken[test-transport-errors]";
  await device(buyer, token);
  await order(buyer);
  await processPushNotifications(env(), async () =>
    Response.json({}, { status: 503 }),
  );
  assert.equal(
    await fixture.db
      .prepare("SELECT state FROM push_jobs WHERE token=?")
      .bind(token)
      .first("state"),
    "pending",
  );
  await fixture.db.prepare("UPDATE push_jobs SET next_attempt_at=0").run();
  await processPushNotifications(env(), async () =>
    Response.json({
      data: { status: "error", details: { error: "DeviceNotRegistered" } },
    }),
  );
  assert.equal(
    await fixture.db
      .prepare("SELECT token FROM push_devices WHERE token=?")
      .bind(token)
      .first(),
    null,
  );
  await device(buyer, token);
  await fixture.db
    .prepare("UPDATE users SET session_version=session_version+1 WHERE id=?")
    .bind(buyer.user.id)
    .run();
  await processPushNotifications(env(), async () => {
    assert.fail("An invalidated session must never receive a push");
  });
  assert.equal(
    await fixture.db
      .prepare("SELECT token FROM push_devices WHERE token=?")
      .bind(token)
      .first(),
    null,
  );
});

test("two devices with different checkout keys cannot purchase the same shared cart twice", async () => {
  const buyer = await customer(),
    addressId = await address(buyer);
  await request("/cart/items", buyer.accessToken, {
    productId: "tap",
    quantity: 1,
  });
  const responses = await Promise.all(
    [1, 2].map(() =>
      fixture.mf.dispatchFetch("http://localhost/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${buyer.accessToken}`,
        },
        body: JSON.stringify({ addressId, checkoutKey: randomUUID() }),
      }),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  assert.ok(responses.some((r) => r.status === 409 || r.status === 400));
  assert.equal((await request("/orders", buyer.accessToken)).orders.length, 1);
});

test("enabled push registration validates tokens, enforces device limits and transfers device ownership", async () => {
  const enabled = await startFixture(0, {
    bindings: {
      PUSH_NOTIFICATIONS_ENABLED: "true",
      EXPO_ACCESS_TOKEN: "test-only-expo-access",
    },
    outboundService: async () =>
      Response.json({ data: { status: "ok", id: "mock-ticket" } }),
  });
  async function call(path, token, body, status = 200) {
    const response = await enabled.mf.dispatchFetch(
      `http://localhost/api/v1${path}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  }
  try {
    const a = await call(
      "/auth/customer-register",
      null,
      {
        name: "Push Tester",
        email: "push-a@matrizo.test",
        phone: "9600000001",
        password: TEST_PASSWORD,
      },
      201,
    );
    const b = await call(
      "/auth/customer-register",
      null,
      {
        name: "Push Tester Two",
        email: "push-b@matrizo.test",
        phone: "9600000002",
        password: TEST_PASSWORD,
      },
      201,
    );
    assert.equal(
      (await call("/account/notifications", a.accessToken)).available,
      true,
    );
    await call(
      "/account/notifications/device",
      a.accessToken,
      { token: "not-a-push-token", platform: "ios" },
      400,
    );
    for (let n = 0; n < 10; n++)
      await call("/account/notifications/device", a.accessToken, {
        token: `ExpoPushToken[test-device-${n}]`,
        platform: "ios",
      });
    await call(
      "/account/notifications/device",
      a.accessToken,
      { token: "ExpoPushToken[test-device-overflow]", platform: "ios" },
      409,
    );
    await call("/account/notifications/device", a.accessToken, {
      token: "ExpoPushToken[test-device-0]",
      platform: "android",
    });
    await call("/account/notifications/device", b.accessToken, {
      token: "ExpoPushToken[test-device-0]",
      platform: "android",
    });
    assert.equal(
      await enabled.db
        .prepare(
          "SELECT user_id FROM push_devices WHERE token='ExpoPushToken[test-device-0]'",
        )
        .first("user_id"),
      b.user.id,
    );
    await call(
      "/account/notifications/device",
      await enabled.sign("admin-test", "admin"),
      { token: "ExpoPushToken[test-staff-device]", platform: "ios" },
      403,
    );
  } finally {
    await enabled.mf.dispose();
  }
});
