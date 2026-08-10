import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { addresses, users } from '../db/schema';
import type { Env } from '../env';
import { type AuthVariables, requireAuth } from '../middleware/auth';

export const accountRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
accountRoutes.use('*', requireAuth);

accountRoutes.get('/profile', async (c) => {
  const db = getDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.id, c.get('userId'))).limit(1);
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ user });
});

const updateProfileSchema = z.object({ name: z.string().min(1).max(100) });

accountRoutes.patch('/profile', async (c) => {
  const parsed = updateProfileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const db = getDb(c.env.DB);
  await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, c.get('userId')));
  return c.json({ success: true });
});

accountRoutes.get('/addresses', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(addresses).where(eq(addresses.userId, c.get('userId')));
  return c.json({ addresses: rows });
});

const addressSchema = z.object({
  label: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/),
  isDefault: z.boolean().optional(),
});

accountRoutes.post('/addresses', async (c) => {
  const parsed = addressSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid address' }, 400);

  const db = getDb(c.env.DB);
  const userId = c.get('userId');
  const id = crypto.randomUUID();

  if (parsed.data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
  }
  await db.insert(addresses).values({
    id,
    userId,
    label: parsed.data.label,
    line1: parsed.data.line1,
    line2: parsed.data.line2,
    city: parsed.data.city,
    state: parsed.data.state,
    pincode: parsed.data.pincode,
    isDefault: parsed.data.isDefault ?? false,
  });

  return c.json({ success: true, id });
});
