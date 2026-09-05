import { DurableObject } from 'cloudflare:workers';

import type { OrderStatus } from '@matrizo/shared';
import type { Env } from '../env';

const STATUS_KEY = 'status';

// One instance per active order (id = order id, keyed via idFromName — see
// wrangler.jsonc and lib/orderTracking.ts). Holds live WebSocket connections
// for that order's tracking page and the last known status, so a reconnect
// gets an immediate answer without a D1 round-trip. D1's
// order_status_events table remains the durable source of truth — this
// class is a fan-out/cache layer, disposable at any time without data loss.
//
// Uses the WebSocket Hibernation API (acceptWebSocket/getWebSockets) so an
// idle tracking connection doesn't hold this DO in memory (and isn't billed
// as busy) between status changes, which for most orders is minutes to
// hours apart.
export class OrderTrackerDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/notify' && request.method === 'POST') {
      const { status } = (await request.json()) as { status: OrderStatus };
      await this.ctx.storage.put(STATUS_KEY, status);

      const message = JSON.stringify({ status, at: new Date().toISOString() });
      for (const ws of this.ctx.getWebSockets()) {
        ws.send(message);
      }
      return new Response(null, { status: 204 });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);

      const status = await this.ctx.storage.get<OrderStatus>(STATUS_KEY);
      if (status) {
        server.send(JSON.stringify({ status, at: new Date().toISOString() }));
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Expected a WebSocket Upgrade request, or POST /notify', { status: 400 });
  }

  // Required by the Hibernation API even though this DO only ever sends,
  // never receives — a no-op handler still has to exist for the runtime to
  // hibernate the connection between messages.
  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer) {}

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    ws.close(code, reason);
  }
}
