import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use('/api/*', cors());

const v1 = app.basePath('/api/v1');

v1.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'matrizo-api',
    timestamp: new Date().toISOString(),
  })
);

export default app;
