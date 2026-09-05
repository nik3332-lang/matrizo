import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from './env';

// Durable Object classes referenced in wrangler.jsonc's `durable_objects`
// binding must be exported from the worker's main module.
export { OrderTrackerDO } from './durable-objects/OrderTrackerDO';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());

const v1 = app.basePath('/api/v1');

v1.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'matrizo-api',
    timestamp: new Date().toISOString(),
  })
);

// Routes (auth, catalog, cart, orders, stores/inventory, owner) land in
// following steps, built against the new store-scoped schema — intentionally
// not carried over from the pre-rewrite worker, since the old route bodies
// assumed a single-store, non-role-based world that no longer matches
// src/db/schema.ts.

export default app;
