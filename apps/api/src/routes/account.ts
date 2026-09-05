import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { addresses, users } from '../db/schema';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';

export const accountRoutes = new Hono<AuthEnv>();

accountRoutes.use('*', requireAuth);

accountRoutes.get('/me', async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  if (!user) return c.json({ error: 'Not found' }, 404);

  return c.json({
    user: {
      id: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
      name: user.name,
      storeId: user.storeId,
    },
  });
});

const addressSchema = z.object({
  label: z.string().trim().optional(),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pincode: z.string().trim().min(4).max(10),
  isDefault: z.boolean().optional(),
});

accountRoutes.get('/addresses', requireRole('customer'), async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const rows = await db.select().from(addresses).where(eq(addresses.userId, auth.sub));
  return c.json({ addresses: rows });
});

accountRoutes.post('/addresses', requireRole('customer'), async (c) => {
  const parsed = addressSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);

  const id = crypto.randomUUID();
  await db.insert(addresses).values({
    id,
    userId: auth.sub,
    label: parsed.data.label ?? null,
    line1: parsed.data.line1,
    line2: parsed.data.line2 ?? null,
    city: parsed.data.city,
    state: parsed.data.state,
    pincode: parsed.data.pincode,
    isDefault: parsed.data.isDefault ?? false,
  });

  const [address] = await db.select().from(addresses).where(eq(addresses.id, id)).limit(1);
  return c.json({ address }, 201);
});
