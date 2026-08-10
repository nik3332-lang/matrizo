import { createMiddleware } from 'hono/factory';

import type { Env } from '../env';
import { verifyToken } from '../lib/jwt';

export type AuthVariables = { userId: string };

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const userId = await verifyToken(c.env, token, 'access');
      c.set('userId', userId);
    } catch {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
  }
);
