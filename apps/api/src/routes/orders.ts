import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { Hono } from 'hono';
import { z } from 'zod';

import { ORDER_STATUSES, priceForQuantity, type OrderStatus } from '@matrizo/shared';
import { getDb } from '../db/client';
import {
  addresses,
  bulkPricingTiers,
  cartItems,
  deliveryAssignments,
  inventory,
  orderItems,
  orderStatusEvents,
  orders,
  products,
  users,
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

  if (auth.role === 'customer') {
    const rows = await db.select().from(orders).where(eq(orders.userId, auth.sub)).orderBy(desc(orders.createdAt));
    return c.json({ orders: rows });
  }

  if (auth.role === 'admin') {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return c.json({ orders: rows });
  }

  if (auth.role === 'delivery_partner') {
    // Only orders actually assigned to this person — not the whole store's
    // queue, which store_staff sees but a delivery partner has no reason to.
    const rows = await db
      .select({ order: orders })
      .from(deliveryAssignments)
      .innerJoin(orders, eq(orders.id, deliveryAssignments.orderId))
      .where(eq(deliveryAssignments.deliveryPartnerUserId, auth.sub))
      .orderBy(desc(orders.createdAt));
    return c.json({ orders: rows.map((r) => r.order) });
  }

  // store_staff
  const rows = await db
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
  const isScopedStoreStaff = auth.role === 'store_staff' && order.storeId === auth.storeId;
  const isAssignedDeliveryPartner =
    auth.role === 'delivery_partner' &&
    (
      await db
        .select()
        .from(deliveryAssignments)
        .where(and(eq(deliveryAssignments.orderId, id), eq(deliveryAssignments.deliveryPartnerUserId, auth.sub)))
        .limit(1)
    ).length > 0;

  if (!isOwnCustomerOrder && !isScopedStoreStaff && !isAssignedDeliveryPartner && auth.role !== 'admin') {
    return c.json({ error: 'Order not found' }, 404);
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const events = await db
    .select()
    .from(orderStatusEvents)
    .where(eq(orderStatusEvents.orderId, id))
    .orderBy(asc(orderStatusEvents.createdAt));

  const [assignmentRow] = await db
    .select({ assignment: deliveryAssignments, partner: users })
    .from(deliveryAssignments)
    .innerJoin(users, eq(users.id, deliveryAssignments.deliveryPartnerUserId))
    .where(eq(deliveryAssignments.orderId, id))
    .limit(1);

  const delivery = assignmentRow
    ? {
        partnerId: assignmentRow.partner.id,
        partnerName: assignmentRow.partner.name,
        assignedAt: assignmentRow.assignment.assignedAt,
        completedAt: assignmentRow.assignment.completedAt,
      }
    : null;

  return c.json({ order, items, events, delivery });
});

const CANCELLABLE_STATUSES: OrderStatus[] = ['placed', 'confirmed'];
const statusUpdateSchema = z.object({ status: z.enum(ORDER_STATUSES) });

orderRoutes.patch('/:id/status', requireAuth, async (c) => {
  const parsed = statusUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;
  const targetStatus = parsed.data.status;

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);

  // Each role gets a narrow, explicit slice of the status machine — not the
  // same "any status, any order at my store" power staff/admin have.
  if (auth.role === 'customer') {
    if (order.userId !== auth.sub) return c.json({ error: 'Order not found' }, 404);
    if (targetStatus !== 'cancelled') {
      return c.json({ error: 'Customers can only cancel an order' }, 403);
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return c.json({ error: `Can't cancel an order that's already ${order.status}` }, 409);
    }
  } else if (auth.role === 'delivery_partner') {
    const [assignment] = await db
      .select()
      .from(deliveryAssignments)
      .where(and(eq(deliveryAssignments.orderId, id), eq(deliveryAssignments.deliveryPartnerUserId, auth.sub)))
      .limit(1);
    if (!assignment) return c.json({ error: 'Order not found' }, 404);
    if (targetStatus !== 'delivered') {
      return c.json({ error: 'Delivery partners can only mark an order delivered' }, 403);
    }
  } else if (auth.role === 'store_staff') {
    if (order.storeId !== auth.storeId) return c.json({ error: 'Forbidden' }, 403);
  } else if (auth.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const batchStatements: BatchItem<'sqlite'>[] = [
    db.update(orders).set({ status: targetStatus }).where(eq(orders.id, id)),
    db.insert(orderStatusEvents).values({
      id: crypto.randomUUID(),
      orderId: id,
      status: targetStatus,
      actorUserId: auth.sub,
    }),
  ];

  // Cancelling gives back the stock that checkout reserved — otherwise
  // every cancellation permanently loses that inventory.
  if (targetStatus === 'cancelled' && order.status !== 'cancelled') {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const stockRows = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.storeId, order.storeId),
          inArray(
            inventory.productId,
            items.map((i) => i.productId)
          )
        )
      );
    const stockByProduct = new Map(stockRows.map((r) => [r.productId, r.stockQty]));
    for (const item of items) {
      batchStatements.push(
        db
          .update(inventory)
          .set({ stockQty: (stockByProduct.get(item.productId) ?? 0) + item.quantity })
          .where(and(eq(inventory.storeId, order.storeId), eq(inventory.productId, item.productId)))
      );
    }
  }

  if (targetStatus === 'delivered') {
    batchStatements.push(
      db.update(deliveryAssignments).set({ completedAt: new Date() }).where(eq(deliveryAssignments.orderId, id))
    );
  }

  await db.batch(batchStatements as unknown as Parameters<typeof db.batch>[0]);
  await notifyOrderStatus(c.env, id, targetStatus);
  return c.json({ ok: true, status: targetStatus });
});

const assignDeliverySchema = z.object({ deliveryPartnerUserId: z.string() });

orderRoutes.patch('/:id/assign-delivery', requireAuth, requireRole('store_staff', 'admin'), async (c) => {
  const parsed = assignDeliverySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ error: 'Order not found' }, 404);
  if (auth.role === 'store_staff' && order.storeId !== auth.storeId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const [partner] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, parsed.data.deliveryPartnerUserId), eq(users.role, 'delivery_partner')))
    .limit(1);
  if (!partner) return c.json({ error: 'Delivery partner not found' }, 404);
  if (partner.storeId !== order.storeId) {
    return c.json({ error: "That delivery partner isn't assigned to this order's store" }, 400);
  }

  const [existing] = await db.select().from(deliveryAssignments).where(eq(deliveryAssignments.orderId, id)).limit(1);
  if (existing) {
    await db
      .update(deliveryAssignments)
      .set({ deliveryPartnerUserId: partner.id, assignedAt: new Date(), completedAt: null })
      .where(eq(deliveryAssignments.id, existing.id));
  } else {
    await db.insert(deliveryAssignments).values({ id: crypto.randomUUID(), orderId: id, deliveryPartnerUserId: partner.id });
  }

  return c.json({ ok: true });
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
