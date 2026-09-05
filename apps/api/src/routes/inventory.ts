import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { inventory, products, stores } from '../db/schema';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';

export const inventoryRoutes = new Hono<AuthEnv>();

inventoryRoutes.use('*', requireAuth, requireRole('store_staff', 'admin'));

inventoryRoutes.get('/stores', async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const rows =
    auth.role === 'admin'
      ? await db.select().from(stores)
      : await db.select().from(stores).where(eq(stores.id, auth.storeId ?? ''));
  return c.json({ stores: rows });
});

inventoryRoutes.get('/:storeId', async (c) => {
  const auth = c.get('auth');
  const storeId = c.req.param('storeId');
  if (auth.role === 'store_staff' && auth.storeId !== storeId) return c.json({ error: 'Forbidden' }, 403);

  const db = getDb(c.env.DB);
  const rows = await db
    .select({ inventoryRow: inventory, product: products })
    .from(inventory)
    .innerJoin(products, eq(products.id, inventory.productId))
    .where(eq(inventory.storeId, storeId));

  return c.json({
    inventory: rows.map((row) => ({ ...row.inventoryRow, product: row.product })),
  });
});

const upsertSchema = z.object({ productId: z.string(), stockQty: z.number().int().min(0) });

inventoryRoutes.put('/:storeId', async (c) => {
  const parsed = upsertSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const storeId = c.req.param('storeId');
  if (auth.role === 'store_staff' && auth.storeId !== storeId) return c.json({ error: 'Forbidden' }, 403);

  const db = getDb(c.env.DB);
  const { productId, stockQty } = parsed.data;

  const [existing] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.storeId, storeId), eq(inventory.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(inventory)
      .set({ stockQty })
      .where(and(eq(inventory.storeId, storeId), eq(inventory.productId, productId)));
  } else {
    await db.insert(inventory).values({ storeId, productId, stockQty });
  }

  return c.json({ ok: true });
});
