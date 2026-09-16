import assert from "node:assert/strict";
import { test } from "node:test";
import { createApiClient } from "../packages/shared/src/apiClient.ts";
test("mobile writes time out without automatic replay, so checkout can recover using its key", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) =>
      init.signal.addEventListener("abort", () => reject(new Error("timeout"))),
    );
  };
  try {
    await assert.rejects(
      createApiClient({ baseUrl: "https://local.test", timeoutMs: 15 }).post(
        "/orders",
        { checkoutKey: "same-key" },
      ),
      /timeout/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("a failed request cannot replay under a different customer after account switching", async () => {
  const original = globalThis.fetch;
  let owner = "customer-a",
    calls = 0,
    refreshes = 0;
  globalThis.fetch = async () => {
    calls++;
    owner = "customer-b";
    return Response.json({ error: "expired" }, { status: 401 });
  };
  try {
    const client = createApiClient({
      baseUrl: "https://local.test",
      getAccessToken: () => `${owner}-token`,
      getSessionIdentity: () => owner,
      refreshAccessToken: async () => {
        refreshes++;
        return true;
      },
    });
    await assert.rejects(
      client.post("/orders", { addressId: "customer-a-address" }),
      /expired/,
    );
    assert.equal(calls, 1);
    assert.equal(refreshes, 0);
  } finally {
    globalThis.fetch = original;
  }
});
