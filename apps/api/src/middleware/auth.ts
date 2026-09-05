import type { Context, Next } from 'hono';

import type { UserRole } from '@matrizo/shared';
import { verifyToken, type AuthClaims } from '../lib/jwt';
import type { Env } from '../env';

export type AuthEnv = { Bindings: Env; Variables: { auth: AuthClaims } };

export async function requireAuth(c: Context<AuthEnv>, next: Next) {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const claims = await verifyToken(c.env, token, 'access');
    c.set('auth', claims);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

// Chain after requireAuth: `v1.get('/x', requireAuth, requireRole('admin'), handler)`.
export function requireRole(...roles: UserRole[]) {
  return async (c: Context<AuthEnv>, next: Next) => {
    const auth = c.get('auth');
    if (!auth || !roles.includes(auth.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}
