import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';

import { getDb } from '../db/client';
import { inventory, orderItems, orders, products } from '../db/schema';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';

export const analyticsRoutes = new Hono<AuthEnv>();

analyticsRoutes.use('*', requireAuth, requireRole('admin'));

analyticsRoutes.get('/summary', async (c) => {
  const db = getDb(c.env.DB);

  // Revenue/order-count figures exclude cancelled orders — a cancelled
  // order was never real revenue, counting it would overstate everything
  // below.
  const allOrders = await db.select().from(orders);
  const liveOrders = allOrders.filter((o) => o.status !== 'cancelled');
  const totalRevenue = liveOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = liveOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const ordersByStatus: Record<string, number> = {};
  for (const o of allOrders) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
  }

  // Best sellers: total quantity sold per product, across order_items
  // (which snapshot productName so this still works for a deleted product).
  const itemRows = await db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: sql<number>`sum(${orderItems.quantity})`.as('quantity'),
      revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.unitPrice})`.as('revenue'),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(sql`${orders.status} != 'cancelled'`)
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(sql`sum(${orderItems.quantity}) desc`)
    .limit(10);

  // Low stock across every store — the per-store Inventory page already
  // shows this scoped to one store; this is the cross-store view for the
  // dashboard.
  const lowStockRows = await db
    .select({
      storeId: inventory.storeId,
      productId: inventory.productId,
      productName: products.name,
      stockQty: inventory.stockQty,
    })
    .from(inventory)
    .innerJoin(products, eq(products.id, inventory.productId))
    .where(sql`${inventory.stockQty} <= 10`)
    .orderBy(inventory.stockQty);

  return c.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    ordersByStatus,
    topProducts: itemRows,
    lowStock: lowStockRows,
  });
});
