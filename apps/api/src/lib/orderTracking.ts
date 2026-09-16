import type { OrderStatus } from "@matrizo/shared";
import type { Env } from "../env";
import { processPushNotifications } from "./pushNotifications";
import { finalizeAccountDeletions } from "./accountDeletion";

// Pushes a status change to that order's OrderTrackerDO, which updates its
// cached "current status" and broadcasts to any connected tracking-page
// WebSockets. D1's order_status_events is already the durable record by the
// time this is called (write that first, then notify) — this is purely the
// live-update side channel.
export async function notifyOrderStatus(
  env: Env,
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const id = env.ORDER_TRACKER.idFromName(orderId);
  const stub = env.ORDER_TRACKER.get(id);
  await Promise.allSettled([
    stub.fetch("https://order-tracker/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    processPushNotifications(env),
    finalizeAccountDeletions(env),
  ]);
}
