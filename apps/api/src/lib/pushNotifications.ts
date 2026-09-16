import type { Env } from "../env";
import type { OrderStatus } from "@matrizo/shared";

export function pushAvailable(env: Env) {
  return (
    env.PUSH_NOTIFICATIONS_ENABLED === "true" && Boolean(env.EXPO_ACCESS_TOKEN)
  );
}
const messages: Record<OrderStatus, string> = {
  placed: "Your order has been placed. Follow its progress in Matrizo.",
  confirmed: "Your order is confirmed. We’re getting it ready.",
  picked: "Your order is packed and ready for dispatch.",
  dispatched: "Your order is on its way.",
  delivered: "Your order has been delivered. Thank you for choosing Matrizo.",
  cancelled: "Your order has been cancelled.",
};
type Job = {
  id: string;
  token: string;
  order_id: string;
  order_status: OrderStatus;
  state: string;
  attempts: number;
  ticket_id: string | null;
  created_at: number;
};

async function expo(
  env: Env,
  path: "send" | "getReceipts",
  body: unknown,
  send: typeof fetch,
) {
  const response = await send(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  // Do not log request bodies, device tokens, credentials or provider responses.
  const data = (await response.json().catch(() => null)) as {
    data?: unknown;
  } | null;
  return { status: response.status, data: data?.data };
}
async function fail(
  env: Env,
  job: Job,
  reason: string,
  retry: boolean,
  now: number,
  keepReceipt = false,
) {
  const again =
    retry && (keepReceipt || job.attempts < 5) && now - job.created_at < 86400;
  await env.DB.prepare(
    "UPDATE push_jobs SET state=?,last_error=?,next_attempt_at=?,lease_until=0,ticket_id=? WHERE id=?",
  )
    .bind(
      again ? (keepReceipt ? "receipt" : "pending") : "failed",
      reason,
      now + Math.min(3600, 60 * 2 ** job.attempts),
      keepReceipt ? job.ticket_id : null,
      job.id,
    )
    .run();
}
export async function processPushNotifications(
  env: Env,
  send: typeof fetch = fetch,
): Promise<void> {
  if (!pushAvailable(env)) return;
  const now = Math.floor(Date.now() / 1000);
  // Catch up from committed order events after a crash or temporary outage.
  // Only the current status is sent; old progress messages are no longer useful.
  await env.DB.prepare(
    `INSERT OR IGNORE INTO push_jobs
    (id,event_id,order_id,token,order_status,state,attempts,next_attempt_at,lease_until,created_at)
    SELECT lower(hex(randomblob(16))),e.id,o.id,d.token,e.status,'pending',0,?,0,?
    FROM order_status_events e JOIN orders o ON o.id=e.order_id
    JOIN push_devices d ON d.user_id=o.user_id JOIN users u ON u.id=d.user_id
    WHERE e.created_at>=? AND e.created_at>=d.created_at AND e.status=o.status
    AND u.active=1 AND u.session_version=d.session_version AND u.deletion_requested_at IS NULL`,
  )
    .bind(now, now, now - 86400)
    .run();
  const due = await env.DB.prepare(
    `SELECT j.* FROM push_jobs j JOIN push_devices d ON d.token=j.token
    JOIN users u ON u.id=d.user_id JOIN orders o ON o.id=j.order_id
    WHERE j.state IN ('pending','sending','receipt') AND j.next_attempt_at<=? AND j.lease_until<=?
    AND u.active=1 AND u.session_version=d.session_version AND o.user_id=d.user_id
    AND (o.status=j.order_status OR j.state='receipt') ORDER BY j.created_at LIMIT 10`,
  )
    .bind(now, now)
    .all<Job>();
  for (const original of due.results) {
    if (now - original.created_at > 86400) {
      await fail(env, original, "expired", false, now);
      continue;
    }
    const claim = await env.DB.prepare(
      `UPDATE push_jobs SET lease_until=?,state=CASE WHEN state='receipt' THEN 'receipt' ELSE 'sending' END,
      attempts=attempts+CASE WHEN state='receipt' THEN 0 ELSE 1 END
      WHERE id=? AND lease_until<=? AND next_attempt_at<=? AND state=? RETURNING *`,
    )
      .bind(now + 120, original.id, now, now, original.state)
      .first<Job>();
    if (!claim) continue;
    try {
      const receipt = original.state === "receipt";
      const result = await expo(
        env,
        receipt ? "getReceipts" : "send",
        receipt
          ? { ids: [claim.ticket_id] }
          : {
              to: claim.token,
              title: "Matrizo",
              body: messages[claim.order_status],
              data: { orderId: claim.order_id },
              sound: "default",
              channelId: "orders",
              ttl: 3600,
            },
        send,
      );
      if (result.status < 200 || result.status >= 300) {
        await fail(
          env,
          claim,
          `http_${result.status}`,
          result.status === 429 || result.status >= 500,
          now,
          receipt,
        );
        continue;
      }
      type Result = {
        status?: string;
        id?: string;
        details?: { error?: string };
      };
      const item = receipt
        ? (result.data as Record<string, Result> | undefined)?.[
            claim.ticket_id!
          ]
        : ((Array.isArray(result.data) ? result.data[0] : result.data) as
            | Result
            | undefined);
      if (receipt && !item) {
        await env.DB.prepare(
          "UPDATE push_jobs SET next_attempt_at=?,lease_until=0 WHERE id=?",
        )
          .bind(now + 300, claim.id)
          .run();
        continue;
      }
      if (item?.details?.error === "DeviceNotRegistered") {
        await env.DB.prepare("DELETE FROM push_devices WHERE token=?")
          .bind(claim.token)
          .run();
        continue;
      }
      if (item?.status === "ok" && (receipt || item.id)) {
        await env.DB.prepare(
          "UPDATE push_jobs SET state=?,ticket_id=?,next_attempt_at=?,lease_until=0,last_error=NULL WHERE id=?",
        )
          .bind(
            receipt ? "delivered" : "receipt",
            item.id ?? claim.ticket_id,
            now + 900,
            claim.id,
          )
          .run();
      } else
        await fail(
          env,
          claim,
          "provider_error",
          item?.details?.error === "MessageRateExceeded",
          now,
        );
    } catch {
      await fail(
        env,
        claim,
        "transport_error",
        true,
        now,
        original.state === "receipt",
      );
    }
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM push_jobs WHERE created_at<?").bind(
      now - 7 * 86400,
    ),
    env.DB.prepare(
      "DELETE FROM push_devices WHERE updated_at<? OR EXISTS (SELECT 1 FROM users WHERE id=push_devices.user_id AND (active=0 OR session_version<>push_devices.session_version))",
    ).bind(now - 90 * 86400),
  ]);
}
