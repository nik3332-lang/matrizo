import { createMiddleware } from 'hono/factory';

import type { Env } from '../env';
import { verifyToken } from '../lib/jwt';

export const requireOwner = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    await verifyToken(c.env, token, 'owner');
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
});
