import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { priceForQuantity } from '@matrizo/shared';
import { getDb } from '../db/client';
import { bulkPricingTiers, cartItems, products } from '../db/schema';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';

export const cartRoutes = new Hono<AuthEnv>();

cartRoutes.use('*', requireAuth, requireRole('customer'));

async function serializeCart(db: ReturnType<typeof getDb>, userId: string) {
  const rows = await db
    .select({ cartItem: cartItems, product: products })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.userId, userId));

  const productIds = rows.map((r) => r.product.id);
  const tierRows = productIds.length
    ? await db.select().from(bulkPricingTiers).where(inArray(bulkPricingTiers.productId, productIds))
    : [];

  const tiersByProduct = new Map<string, typeof tierRows>();
  for (const tier of tierRows) {
    const list = tiersByProduct.get(tier.productId) ?? [];
    list.push(tier);
    tiersByProduct.set(tier.productId, list);
  }

  const items = rows.map(({ cartItem, product }) => {
    const unitPrice = priceForQuantity(tiersByProduct.get(product.id) ?? [], cartItem.quantity, product.basePrice);
    return {
      id: cartItem.id,
      product,
      quantity: cartItem.quantity,
      unitPrice,
      lineTotal: unitPrice * cartItem.quantity,
    };
  });

  return { items, subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0) };
}

cartRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  return c.json(await serializeCart(getDb(c.env.DB), auth.sub));
});

const addItemSchema = z.object({ productId: z.string(), quantity: z.number().int().positive() });

cartRoutes.post('/items', async (c) => {
  const parsed = addItemSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const { productId, quantity } = parsed.data;
  const auth = c.get('auth');
  const db = getDb(c.env.DB);

  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product || !product.active) return c.json({ error: 'Product not found' }, 404);

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, auth.sub), eq(cartItems.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(cartItems)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({ id: crypto.randomUUID(), userId: auth.sub, productId, quantity });
  }

  return c.json(await serializeCart(db, auth.sub));
});

const updateItemSchema = z.object({ quantity: z.number().int().min(0) });

cartRoutes.patch('/items/:productId', async (c) => {
  const parsed = updateItemSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const productId = c.req.param('productId');

  if (parsed.data.quantity === 0) {
    await db.delete(cartItems).where(and(eq(cartItems.userId, auth.sub), eq(cartItems.productId, productId)));
  } else {
    await db
      .update(cartItems)
      .set({ quantity: parsed.data.quantity })
      .where(and(eq(cartItems.userId, auth.sub), eq(cartItems.productId, productId)));
  }

  return c.json(await serializeCart(db, auth.sub));
});

cartRoutes.delete('/items/:productId', async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const productId = c.req.param('productId');

  await db.delete(cartItems).where(and(eq(cartItems.userId, auth.sub), eq(cartItems.productId, productId)));
  return c.json(await serializeCart(db, auth.sub));
});
