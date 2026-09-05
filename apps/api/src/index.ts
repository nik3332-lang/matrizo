import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { accountRoutes } from './routes/account';
import { authRoutes } from './routes/auth';
import { cartRoutes } from './routes/cart';
import { catalogRoutes } from './routes/catalog';
import { inventoryRoutes } from './routes/inventory';
import { orderRoutes } from './routes/orders';
import { serviceabilityRoutes } from './routes/serviceability';
import type { Env } from './env';
import type { AuthEnv } from './middleware/auth';

// Durable Object classes referenced in wrangler.jsonc's `durable_objects`
// binding must be exported from the worker's main module.
export { OrderTrackerDO } from './durable-objects/OrderTrackerDO';

const app = new Hono<AuthEnv>();

app.use('/api/*', cors());

const v1 = app.basePath('/api/v1');

v1.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'matrizo-api',
    timestamp: new Date().toISOString(),
  })
);

v1.route('/', catalogRoutes);
v1.route('/serviceability', serviceabilityRoutes);
v1.route('/auth', authRoutes);
v1.route('/account', accountRoutes);
v1.route('/cart', cartRoutes);
v1.route('/orders', orderRoutes);
v1.route('/inventory', inventoryRoutes);

export default app;
