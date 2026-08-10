import { priceForQuantity } from '@matrizo/shared';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { addresses, bulkPricingTiers, cartItems, orderItems, orders, products } from '../db/schema';
import type { Env } from '../env';
import { createRazorpayOrder, isRazorpayConfigured } from '../lib/razorpay';
import { type AuthVariables, requireAuth } from '../middleware/auth';

export const orderRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
orderRoutes.use('*', requireAuth);

const createOrderSchema = z.object({
  addressId: z.string().min(1),
  paymentMethod: z.enum(['cod', 'razorpay']),
});

orderRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const parsed = createOrderSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const { addressId, paymentMethod } = parsed.data;

  const db = getDb(c.env.DB);

  const [address] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .limit(1);
  if (!address) return c.json({ error: 'Address not found' }, 404);

  const cartRows = await db
    .select({ item: cartItems, product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));
  if (cartRows.length === 0) return c.json({ error: 'Cart is empty' }, 400);

  if (paymentMethod === 'razorpay' && !isRazorpayConfigured(c.env)) {
    return c.json({ error: 'Online payment is not available yet — choose Pay on Delivery' }, 400);
  }

  const tiers = await db
    .select()
    .from(bulkPricingTiers)
    .where(
      inArray(
        bulkPricingTiers.productId,
        cartRows.map((r) => r.product.id)
      )
    );

  let total = 0;
  const itemsToInsert = cartRows.map((row) => {
    const productTiers = tiers.filter((t) => t.productId === row.product.id);
    const unitPrice = priceForQuantity(productTiers, row.item.quantity, row.product.basePrice);
    total += unitPrice * row.item.quantity;
    return {
      id: crypto.randomUUID(),
      productId: row.product.id,
      productName: row.product.name,
      quantity: row.item.quantity,
      unitPrice,
    };
  });

  const orderId = crypto.randomUUID();
  const razorpayOrderId =
    paymentMethod === 'razorpay' ? await createRazorpayOrder(c.env, orderId, total) : null;

  await db.insert(orders).values({
    id: orderId,
    userId,
    addressId,
    status: 'placed',
    paymentMethod,
    paymentStatus: 'pending',
    totalAmount: total,
    razorpayOrderId,
  });
  await db.insert(orderItems).values(itemsToInsert.map((item) => ({ ...item, orderId })));
  await db.delete(cartItems).where(eq(cartItems.userId, userId));

  return c.json({ orderId, total, razorpayOrderId });
});

orderRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, c.get('userId')))
    .orderBy(desc(orders.createdAt));
  return c.json({ orders: rows });
});

orderRoutes.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const userId = c.get('userId');
  const id = c.req.param('id');

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return c.json({ order, items });
});
