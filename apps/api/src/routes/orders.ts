import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { Hono } from 'hono';
import { z } from 'zod';

import { ORDER_STATUSES, priceForQuantity } from '@matrizo/shared';
import { getDb } from '../db/client';
import {
  addresses,
  bulkPricingTiers,
  cartItems,
  inventory,
  orderItems,
  orderStatusEvents,
  orders,
  products,
} from '../db/schema';
import { findStoreWithStock } from '../lib/orderAssignment';
import { notifyOrderStatus } from '../lib/orderTracking';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';

export const orderRoutes = new Hono<AuthEnv>();

const checkoutSchema = z.object({ addressId: z.string() });

// Checkout: COD only for now (payments.ts / Razorpay wiring is a separate,
// later step). Assigns to the nearest store that both serves the address's
// pincode and has stock for the whole cart, then writes the order, its
// items, the first status event, and the inventory decrement as one atomic
// D1 batch — a partial write here (order created but stock not
// decremented, say) would be a real correctness bug, not just untidy.
orderRoutes.post('/', requireAuth, requireRole('customer'), async (c) => {
  const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);

  const [address] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, parsed.data.addressId), eq(addresses.userId, auth.sub)))
    .limit(1);
  if (!address) return c.json({ error: 'Address not found' }, 404);

  const cartRows = await db
    .select({ cartItem: cartItems, product: products })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.userId, auth.sub));
  if (cartRows.length === 0) return c.json({ error: 'Cart is empty' }, 400);

  const productIds = cartRows.map((r) => r.product.id);
  const tierRows = await db.select().from(bulkPricingTiers).where(inArray(bulkPricingTiers.productId, productIds));
  const tiersByProduct = new Map<string, typeof tierRows>();
  for (const tier of tierRows) {
    const list = tiersByProduct.get(tier.productId) ?? [];
    list.push(tier);
    tiersByProduct.set(tier.productId, list);
  }

  const lines = cartRows.map(({ cartItem, product }) => ({
    productId: product.id,
    productName: product.name,
    quantity: cartItem.quantity,
    unitPrice: priceForQuantity(tiersByProduct.get(product.id) ?? [], cartItem.quantity, product.basePrice),
  }));

  const store = await findStoreWithStock(
    db,
    address.pincode,
    lines.map((l) => ({ productId: l.productId, quantity: l.quantity }))
  );
  if (!store) {
    return c.json({ error: 'Not serviceable, or insufficient stock at the store(s) covering this address' }, 409);
  }

  const currentStock = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.storeId, store.storeId), inArray(inventory.productId, productIds)));
  const stockByProduct = new Map(currentStock.map((row) => [row.productId, row.stockQty]));

  const orderId = crypto.randomUUID();
  const totalAmount = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  // Explicit BatchItem<'sqlite'>[] annotation: db.batch()'s own type wants a
  // non-empty tuple, which a dynamically-built array (spreads of per-line
  // inserts/updates) can't satisfy statically — cast through this instead
  // of `as any`.
  const statements: BatchItem<'sqlite'>[] = [
    db.insert(orders).values({
      id: orderId,
      userId: auth.sub,
      storeId: store.storeId,
      addressId: address.id,
      status: 'placed',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      totalAmount,
    }),
    ...lines.map((line) =>
      db.insert(orderItems).values({
        id: crypto.randomUUID(),
        orderId,
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })
    ),
    db.insert(orderStatusEvents).values({
      id: crypto.randomUUID(),
      orderId,
      status: 'placed',
      actorUserId: auth.sub,
    }),
    ...lines.map((line) =>
      db
        .update(inventory)
        .set({ stockQty: (stockByProduct.get(line.productId) ?? 0) - line.quantity })
        .where(and(eq(inventory.storeId, store.storeId), eq(inventory.productId, line.productId)))
    ),
    db.delete(cartItems).where(eq(cartItems.userId, auth.sub)),
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);

  await notifyOrderStatus(c.env, orderId, 'placed');

  return c.json({ orderId, storeId: store.storeId, totalAmount, status: 'placed' }, 201);
});

orderRoutes.get('/', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);

  const rows =
    auth.role === 'customer'
      ? await db.select().from(orders).where(eq(orders.userId, auth.sub)).orderBy(desc(orders.createdAt))
      : auth.role === 'admin'
        ? await db.select().from(orders).orderBy(desc(orders.createdAt))
        : await db
            .select()
            .from(orders)
            .where(eq(orders.storeId, auth.storeId ?? ''))
            .orderBy(desc(orders.createdAt));

  return c.json({ orders: rows });
});

orderRoutes.get('/:id', requireAuth, async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  const isOwnCustomerOrder = auth.role === 'customer' && order.userId === auth.sub;
  const isScopedStoreStaff =
    (auth.role === 'store_staff' || auth.role === 'delivery_partner') && order.storeId === auth.storeId;
  if (!isOwnCustomerOrder && !isScopedStoreStaff && auth.role !== 'admin') {
    return c.json({ error: 'Order not found' }, 404);
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const events = await db
    .select()
    .from(orderStatusEvents)
    .where(eq(orderStatusEvents.orderId, id))
    .orderBy(asc(orderStatusEvents.createdAt));

  return c.json({ order, items, events });
});

const statusUpdateSchema = z.object({ status: z.enum(ORDER_STATUSES) });

orderRoutes.patch('/:id/status', requireAuth, requireRole('store_staff', 'admin'), async (c) => {
  const parsed = statusUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);
  if (auth.role === 'store_staff' && order.storeId !== auth.storeId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const statusStatements: BatchItem<'sqlite'>[] = [
    db.update(orders).set({ status: parsed.data.status }).where(eq(orders.id, id)),
    db.insert(orderStatusEvents).values({
      id: crypto.randomUUID(),
      orderId: id,
      status: parsed.data.status,
      actorUserId: auth.sub,
    }),
  ];
  await db.batch(statusStatements as unknown as Parameters<typeof db.batch>[0]);

  await notifyOrderStatus(c.env, id, parsed.data.status);
  return c.json({ ok: true, status: parsed.data.status });
});

// Live order tracking over WebSocket — proxies straight through to that
// order's Durable Object (see durable-objects/OrderTrackerDO.ts). No auth
// middleware here deliberately: the order id itself (a UUID) is the
// capability — same trade-off as an unguessable tracking-link URL. Revisit
// if that's not an acceptable bar later.
orderRoutes.get('/:id/track', async (c) => {
  const id = c.req.param('id')!;
  const stubId = c.env.ORDER_TRACKER.idFromName(id);
  const stub = c.env.ORDER_TRACKER.get(stubId);
  return stub.fetch(c.req.raw);
});
