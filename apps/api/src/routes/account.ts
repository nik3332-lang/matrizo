import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { addresses, orders, users } from '../db/schema';
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

const updateMeSchema = z.object({ name: z.string().trim().min(1) });

accountRoutes.patch('/me', async (c) => {
  const parsed = updateMeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);

  await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, auth.sub));
  const [user] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  return c.json({
    user: { id: user.id, role: user.role, phone: user.phone, email: user.email, name: user.name, storeId: user.storeId },
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

// Only one address can be "default" at a time — clear the flag on every
// other address for this user before setting it here. Called from both
// create and update whenever isDefault: true is passed.
async function clearOtherDefaults(db: ReturnType<typeof getDb>, userId: string, exceptId?: string) {
  const rows = await db.select().from(addresses).where(eq(addresses.userId, userId));
  await Promise.all(
    rows
      .filter((a) => a.isDefault && a.id !== exceptId)
      .map((a) => db.update(addresses).set({ isDefault: false }).where(eq(addresses.id, a.id)))
  );
}

accountRoutes.post('/addresses', requireRole('customer'), async (c) => {
  const parsed = addressSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);

  const id = crypto.randomUUID();
  if (parsed.data.isDefault) await clearOtherDefaults(db, auth.sub);
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

accountRoutes.patch('/addresses/:id', requireRole('customer'), async (c) => {
  const parsed = addressSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;

  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, auth.sub)))
    .limit(1);
  if (!existing) return c.json({ error: 'Address not found' }, 404);

  if (parsed.data.isDefault) await clearOtherDefaults(db, auth.sub, id);
  await db.update(addresses).set(parsed.data).where(eq(addresses.id, id));

  const [address] = await db.select().from(addresses).where(eq(addresses.id, id)).limit(1);
  return c.json({ address });
});

accountRoutes.delete('/addresses/:id', requireRole('customer'), async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;

  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, auth.sub)))
    .limit(1);
  if (!existing) return c.json({ error: 'Address not found' }, 404);

  // orders.addressId references this row with no ON DELETE behavior — same
  // FK-enforcement issue as products (see routes/catalog.ts). An address
  // that's been used on a past order can't be hard-deleted; there's no
  // "active" flag on addresses to fall back to like products have, so the
  // honest answer here is refuse, not silently no-op.
  const [orderUsingAddress] = await db.select().from(orders).where(eq(orders.addressId, id)).limit(1);
  if (orderUsingAddress) {
    return c.json({ error: "Can't delete an address used on a past order." }, 409);
  }

  await db.delete(addresses).where(eq(addresses.id, id));
  return c.json({ ok: true });
});
