import { priceForQuantity } from '@matrizo/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { bulkPricingTiers, cartItems, products } from '../db/schema';
import type { Env } from '../env';
import { type AuthVariables, requireAuth } from '../middleware/auth';

export const cartRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
cartRoutes.use('*', requireAuth);

const addItemSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive() });
const updateItemSchema = z.object({ quantity: z.number().int().positive() });

cartRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env.DB);

  const rows = await db
    .select({ item: cartItems, product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

  const tiers =
    rows.length === 0
      ? []
      : await db
          .select()
          .from(bulkPricingTiers)
          .where(
            inArray(
              bulkPricingTiers.productId,
              rows.map((r) => r.product.id)
            )
          );

  let subtotal = 0;
  const items = rows.map((row) => {
    const productTiers = tiers.filter((t) => t.productId === row.product.id);
    const unitPrice = priceForQuantity(productTiers, row.item.quantity, row.product.basePrice);
    const lineTotal = unitPrice * row.item.quantity;
    subtotal += lineTotal;
    return { id: row.item.id, product: row.product, quantity: row.item.quantity, unitPrice, lineTotal };
  });

  return c.json({ items, subtotal });
});

cartRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const parsed = addItemSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const { productId, quantity } = parsed.data;

  const db = getDb(c.env.DB);
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || !product.active) return c.json({ error: 'Product not found' }, 404);

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(cartItems)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({ id: crypto.randomUUID(), userId, productId, quantity });
  }

  return c.json({ success: true });
});

cartRoutes.patch('/:itemId', async (c) => {
  const userId = c.get('userId');
  const parsed = updateItemSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const itemId = c.req.param('itemId');
  const [item] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)))
    .limit(1);
  if (!item) return c.json({ error: 'Cart item not found' }, 404);

  await db.update(cartItems).set({ quantity: parsed.data.quantity }).where(eq(cartItems.id, itemId));
  return c.json({ success: true });
});

cartRoutes.delete('/:itemId', async (c) => {
  const userId = c.get('userId');
  const itemId = c.req.param('itemId');
  const db = getDb(c.env.DB);
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)));
  return c.json({ success: true });
});
