import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { startFixture, TEST_PASSWORD } from "../scripts/local-platform.mjs";
import { normalizePhone } from "../apps/api/src/lib/phone.ts";
let fixture,
  unavailable,
  sequence = 0,
  deliveryFails = false;
const messages = [];
const NEW_PASSWORD = "Matrizo-new-password-2026";
async function request(path, body, status = 200, token, target = fixture) {
  const response = await target.mf.dispatchFetch(
    "http://localhost/api/v1" + path,
    {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  const data = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`);
  return data;
}
async function customer(phone) {
  const n = ++sequence;
  return request(
    "/auth/customer-register",
    {
      name: "Recovery Test",
      phone: phone ?? String(9800000000 + n),
      email: `recovery-${n}@matrizo.test`,
      password: TEST_PASSWORD,
    },
    201,
  );
}
async function challenge(destination, path = "/password-reset/email/request") {
  const email = path.includes("/email/");
  const sentBefore = messages.length;
  const result = await request(
    "/auth" + path,
    email ? { email: destination } : { phone: destination },
  );
  for (let n = 0; n < 50 && messages.length === sentBefore; n++)
    await new Promise((r) => setTimeout(r, 10));
  const message = messages.at(-1);
  assert.equal(
    message.destination,
    email ? destination.toLowerCase() : `91${normalizePhone(destination)}`,
  );
  assert.match(message.code, /^\d{6}$/);
  assert.equal(result.devOtp, undefined);
  assert.equal(result.code, undefined);
  return { ...result, code: message.code, email };
}
function confirm(proof, status = 200, password = NEW_PASSWORD) {
  return request(
    proof.email
      ? "/auth/password-reset/email/confirm"
      : "/auth/password-reset/confirm",
    { challengeId: proof.challengeId, code: proof.code, password },
    status,
  );
}
before(async () => {
  fixture = await startFixture(0, {
    bindings: {
      RESEND_API_KEY: "test-only-resend-key",
      RESEND_FROM_EMAIL: "Matrizo <info@matrizo.com>",
      MSG91_AUTH_KEY: "test-only-auth-key",
      MSG91_TEMPLATE_ID: "test-only-template",
    },
    outboundService: async (req) => {
      const url = new URL(req.url);
      if (url.origin + url.pathname === "https://api.resend.com/emails") {
        assert.equal(
          req.headers.get("Authorization"),
          "Bearer test-only-resend-key",
        );
        assert.match(req.headers.get("Idempotency-Key"), /^password-reset\//);
        const body = await req.json();
        assert.equal(body.from, "Matrizo <info@matrizo.com>");
        assert.equal(body.subject, "Your Matrizo password reset code");
        assert.ok(body.html.includes("MATRIZO"));
        const code = body.text.match(/code is (\d{6})/)[1];
        assert.ok(body.html.includes(code));
        messages.push({ destination: body.to[0], code });
        return Response.json(
          deliveryFails
            ? { message: "Provider failure" }
            : { id: "test-delivery" },
          { status: deliveryFails ? 503 : 200 },
        );
      }
      assert.equal(
        url.origin + url.pathname,
        "https://control.msg91.com/api/v5/otp",
      );
      assert.equal(req.method, "POST");
      assert.equal(req.headers.get("authkey"), "test-only-auth-key");
      assert.equal(url.searchParams.get("template_id"), "test-only-template");
      assert.equal(url.searchParams.get("otp_expiry"), "5");
      messages.push({
        destination: url.searchParams.get("mobile"),
        code: url.searchParams.get("otp"),
      });
      return Response.json({ type: deliveryFails ? "error" : "success" });
    },
  });
  unavailable = await startFixture();
});
beforeEach(async () => {
  deliveryFails = false;
  messages.length = 0;
  await fixture.db.prepare("DELETE FROM auth_rate_limits").run();
  await fixture.db.prepare("DELETE FROM auth_challenges").run();
});
after(async () => {
  await fixture?.mf.dispose();
  await unavailable?.mf.dispose();
});

test("Indian phone normalization accepts common formats and rejects malformed or foreign numbers", () => {
  for (const phone of [
    "9876543210",
    "+91 98765 43210",
    "91-9876543210",
    "(09876543210)",
  ])
    assert.equal(normalizePhone(phone), "9876543210");
  for (const phone of [
    "abc9876543210",
    "+1 9876543210",
    "1234567890",
    "+9876543210",
    "98765",
    "9198765432101",
  ])
    assert.equal(normalizePhone(phone), null);
});
test("customers can use email, mobile and country-code formats; staff remain separate", async () => {
  const account = await customer("+91 98765 43210");
  assert.equal(account.user.phone, "9876543210");
  for (const identifier of [
    account.user.email.toUpperCase(),
    "9876543210",
    "+91 98765 43210",
    "919876543210",
  ])
    assert.equal(
      (
        await request("/auth/customer-login", {
          identifier,
          password: TEST_PASSWORD,
        })
      ).user.id,
      account.user.id,
    );
  await request(
    "/auth/customer-login",
    { identifier: "9876543210", password: "wrong" },
    401,
  );
  await request(
    "/auth/customer-login",
    { identifier: "employee-test@matrizo.test", password: TEST_PASSWORD },
    401,
  );
  await request(
    "/auth/customer-register",
    {
      name: "Duplicate",
      phone: "+91 9876543210",
      email: "different@matrizo.test",
      password: TEST_PASSWORD,
    },
    409,
  );
});
test("legacy phone formats work, but colliding aliases never choose an arbitrary account", async () => {
  const account = await customer();
  const phone = account.user.phone;
  await fixture.db
    .prepare("UPDATE users SET phone=? WHERE id=?")
    .bind(`+91${phone}`, account.user.id)
    .run();
  await request("/auth/customer-login", {
    identifier: phone,
    password: TEST_PASSWORD,
  });
  await fixture.db
    .prepare("INSERT INTO users (id,phone) VALUES ('ambiguous',?)")
    .bind(phone)
    .run();
  await request(
    "/auth/customer-login",
    { identifier: phone, password: TEST_PASSWORD },
    401,
  );
});
test("reset codes are private, single-use and revoke both existing access and refresh sessions", async () => {
  const account = await customer();
  const proof = await challenge(account.user.email);
  const stored = await fixture.db
    .prepare("SELECT * FROM auth_challenges WHERE id=?")
    .bind(proof.challengeId)
    .first();
  assert.match(stored.code_hash, /^[0-9a-f]{64}$/);
  assert.notEqual(stored.code_hash, proof.code);
  await confirm(
    { ...proof, code: proof.code === "000000" ? "111111" : "000000" },
    401,
  );
  assert.equal((await confirm(proof)).reset, true);
  await request("/account/me", undefined, 401, account.accessToken);
  await request("/auth/refresh", { refreshToken: account.refreshToken }, 401);
  await request(
    "/auth/customer-login",
    { identifier: account.user.phone, password: TEST_PASSWORD },
    401,
  );
  const login = await request("/auth/customer-login", {
    identifier: account.user.phone,
    password: NEW_PASSWORD,
  });
  await request("/account/me", undefined, 200, login.accessToken);
  await request("/auth/refresh", { refreshToken: login.refreshToken });
  await confirm(proof, 401);
});
test("five incorrect guesses exhaust a challenge even when the next guess is correct", async () => {
  const account = await customer();
  const proof = await challenge(account.user.email);
  const wrong = proof.code === "000000" ? "111111" : "000000";
  for (let n = 0; n < 5; n++) await confirm({ ...proof, code: wrong }, 401);
  await confirm(proof, 401);
  assert.equal(
    (
      await fixture.db
        .prepare("SELECT attempts FROM auth_challenges WHERE id=?")
        .bind(proof.challengeId)
        .first()
    ).attempts,
    5,
  );
});
test("expired codes and codes for a different purpose cannot reset a password", async () => {
  const account = await customer();
  const proof = await challenge(account.user.phone, "/otp/request");
  await confirm(proof, 401);
  const otpLogin = await request("/auth/otp/verify", {
    challengeId: proof.challengeId,
    code: proof.code,
  });
  assert.equal(otpLogin.user.id, account.user.id);
  await request(
    "/auth/otp/verify",
    { challengeId: proof.challengeId, code: proof.code },
    401,
  );
  await fixture.db.prepare("DELETE FROM auth_rate_limits").run();
  const reset = await challenge(account.user.email);
  await fixture.db
    .prepare("UPDATE auth_challenges SET expires_at=1 WHERE id=?")
    .bind(reset.challengeId)
    .run();
  await confirm(reset, 401);
});
test("concurrent code redemption changes the password once", async () => {
  const account = await customer();
  const proof = await challenge(account.user.email);
  const responses = await Promise.all(
    [1, 2].map(() =>
      fixture.mf.dispatchFetch(
        "http://localhost/api/v1/auth/password-reset/email/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: proof.challengeId,
            code: proof.code,
            password: NEW_PASSWORD,
          }),
        },
      ),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 401]);
  assert.equal(
    (
      await fixture.db
        .prepare("SELECT session_version FROM users WHERE id=?")
        .bind(account.user.id)
        .first()
    ).session_version,
    1,
  );
});
test("resending invalidates the old code and cooldown blocks duplicate sends", async () => {
  const account = await customer();
  const first = await challenge(account.user.email);
  await request(
    "/auth/password-reset/email/request",
    { email: account.user.email },
    429,
  );
  assert.equal(messages.length, 1);
  await fixture.db.prepare("UPDATE auth_rate_limits SET expires_at=1").run();
  const second = await challenge(account.user.email);
  assert.notEqual(first.challengeId, second.challengeId);
  await confirm(first, 401);
  await confirm(second);
});
test("unknown, inactive and staff emails get the same response without sending mail", async () => {
  const inactive = await customer();
  await fixture.db
    .prepare("UPDATE users SET active=0 WHERE id=?")
    .bind(inactive.user.id)
    .run();
  await fixture.db
    .prepare("UPDATE users SET phone='9888888888' WHERE id='employee-test'")
    .run();
  const replies = [];
  for (const email of [
    "unknown@matrizo.test",
    inactive.user.email,
    "employee-test@matrizo.test",
  ]) {
    const { challengeId, ...response } = await request(
      "/auth/password-reset/email/request",
      { email },
    );
    assert.ok(challengeId);
    replies.push(response);
  }
  assert.deepEqual(replies[0], replies[1]);
  assert.deepEqual(replies[1], replies[2]);
  assert.equal(messages.length, 0);
});
test("provider rejection invalidates codes; absent configuration fails closed", async () => {
  const account = await customer();
  deliveryFails = true;
  const proof = await challenge(account.user.email);
  for (let n = 0; n < 50; n++) {
    if (
      (
        await fixture.db
          .prepare("SELECT consumed_at FROM auth_challenges WHERE id=?")
          .bind(proof.challengeId)
          .first()
      ).consumed_at
    )
      break;
    await new Promise((r) => setTimeout(r, 10));
  }
  await confirm(proof, 401);
  assert.deepEqual(
    await request("/auth/options", undefined, 200, undefined, unavailable),
    { passwordReset: false, smsPasswordReset: false },
  );
  const disabled = await request(
    "/auth/password-reset/email/request",
    { email: account.user.email },
    503,
    undefined,
    unavailable,
  );
  assert.equal(disabled.challengeId, undefined);
});
test("account deactivation after delivery prevents a reset", async () => {
  const account = await customer();
  const proof = await challenge(account.user.email);
  await fixture.db
    .prepare("UPDATE users SET active=0 WHERE id=?")
    .bind(account.user.id)
    .run();
  await confirm(proof, 401);
  assert.equal(
    (
      await fixture.db
        .prepare("SELECT session_version FROM users WHERE id=?")
        .bind(account.user.id)
        .first()
    ).session_version,
    0,
  );
});
