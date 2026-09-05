import { DurableObject } from 'cloudflare:workers';

import type { Env } from '../env';

// One instance per active order (id = order id, see wrangler.jsonc). Holds
// live WebSocket connections for that order's tracking page and the last
// known status, so a reconnect doesn't need a D1 round-trip. D1's
// order_status_events table remains the durable source of truth — this
// class is a fan-out cache, disposable at any time without data loss.
//
// Stubbed for now (health-check scaffolding pass); the WebSocket upgrade
// handler and status broadcast land with the order-tracking API route.
export class OrderTrackerDO extends DurableObject<Env> {
  async fetch(_request: Request): Promise<Response> {
    return new Response('OrderTrackerDO: not yet implemented', { status: 501 });
  }
}
