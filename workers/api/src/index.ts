import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { accountRoutes } from './routes/account';
import { authRoutes } from './routes/auth';
import { cartRoutes } from './routes/cart';
import { catalogRoutes } from './routes/catalog';
import { deliveryRoutes } from './routes/delivery';
import { orderRoutes } from './routes/orders';
import { ownerRoutes } from './routes/owner';
import { paymentRoutes } from './routes/payments';
import type { Env } from './env';

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

v1.route('/auth', authRoutes);
v1.route('/', catalogRoutes);
v1.route('/cart', cartRoutes);
v1.route('/delivery', deliveryRoutes);
v1.route('/orders', orderRoutes);
v1.route('/payments', paymentRoutes);
v1.route('/account', accountRoutes);
v1.route('/owner', ownerRoutes);

export default app;
