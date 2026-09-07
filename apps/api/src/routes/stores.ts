import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { stores, storeServicePincodes } from '../db/schema';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';

export const storeRoutes = new Hono<AuthEnv>();

storeRoutes.use('*', requireAuth, requireRole('admin'));

storeRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(stores);
  return c.json({ stores: rows });
});

const storeSchema = z.object({
  name: z.string().trim().min(1),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pincode: z.string().trim().min(4).max(10),
  lat: z.number().optional(),
  lng: z.number().optional(),
  active: z.boolean().optional(),
});

storeRoutes.post('/', async (c) => {
  const parsed = storeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();
  await db.insert(stores).values({
    id,
    name: parsed.data.name,
    line1: parsed.data.line1,
    line2: parsed.data.line2 ?? null,
    city: parsed.data.city,
    state: parsed.data.state,
    pincode: parsed.data.pincode,
    lat: parsed.data.lat ?? null,
    lng: parsed.data.lng ?? null,
    active: parsed.data.active ?? true,
  });

  const [store] = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return c.json({ store }, 201);
});

storeRoutes.patch('/:id', async (c) => {
  const parsed = storeSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;
  const [existing] = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Store not found' }, 404);

  await db.update(stores).set(parsed.data).where(eq(stores.id, id));
  const [store] = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return c.json({ store });
});

// Service-area pincodes for a store — "which pincodes does this dark store
// deliver to, and how fast" (see lib/serviceability.ts / orderAssignment.ts,
// the two places that read this table).
storeRoutes.get('/:id/pincodes', async (c) => {
  const db = getDb(c.env.DB);
  const storeId = c.req.param('id')!;
  const rows = await db.select().from(storeServicePincodes).where(eq(storeServicePincodes.storeId, storeId));
  return c.json({ pincodes: rows });
});

const pincodeSchema = z.object({
  pincode: z.string().trim().min(4).max(10),
  etaMinutes: z.number().int().positive().optional(),
});

storeRoutes.post('/:id/pincodes', async (c) => {
  const parsed = pincodeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const storeId = c.req.param('id')!;
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!store) return c.json({ error: 'Store not found' }, 404);

  const [existing] = await db
    .select()
    .from(storeServicePincodes)
    .where(and(eq(storeServicePincodes.storeId, storeId), eq(storeServicePincodes.pincode, parsed.data.pincode)))
    .limit(1);

  if (existing) {
    await db
      .update(storeServicePincodes)
      .set({ etaMinutes: parsed.data.etaMinutes ?? existing.etaMinutes })
      .where(and(eq(storeServicePincodes.storeId, storeId), eq(storeServicePincodes.pincode, parsed.data.pincode)));
  } else {
    await db.insert(storeServicePincodes).values({
      storeId,
      pincode: parsed.data.pincode,
      etaMinutes: parsed.data.etaMinutes ?? 60,
    });
  }
  return c.json({ ok: true });
});

storeRoutes.delete('/:id/pincodes/:pincode', async (c) => {
  const db = getDb(c.env.DB);
  const storeId = c.req.param('id')!;
  const pincode = c.req.param('pincode')!;
  await db
    .delete(storeServicePincodes)
    .where(and(eq(storeServicePincodes.storeId, storeId), eq(storeServicePincodes.pincode, pincode)));
  return c.json({ ok: true });
});
