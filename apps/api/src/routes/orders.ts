import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Hono } from "hono";
import { z } from "zod";

import {
  ORDER_STATUSES,
  priceForQuantity,
  type OrderStatus,
} from "@matrizo/shared";
import { getDb } from "../db/client";
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
  paintShades,
  users,
} from "../db/schema";
import { findStoreWithStock } from "../lib/orderAssignment";
import { categorySettings } from "../lib/categorySettings";
import { notifyOrderStatus } from "../lib/orderTracking";
import { requireAuth, requireRole, type AuthEnv } from "../middleware/auth";

export const orderRoutes = new Hono<AuthEnv>();

const checkoutSchema = z.object({
  addressId: z.string(),
  checkoutKey: z.uuid().optional(),
});

// Checkout: COD only for now (payments.ts / Razorpay wiring is a separate,
// later step). Assigns to the nearest store that both serves the address's
// pincode and has stock for the whole cart, then writes the order, its
// items, the first status event, and the inventory decrement as one atomic
// D1 batch — a partial write here (order created but stock not
// decremented, say) would be a real correctness bug, not just untidy.
orderRoutes.post("/", requireAuth, requireRole("customer"), async (c) => {
  const parsed = checkoutSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const auth = c.get("auth");
  const db = getDb(c.env.DB);

  if (parsed.data.checkoutKey) {
    const [existing] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, auth.sub),
          eq(orders.checkoutKey, parsed.data.checkoutKey),
        ),
      )
      .limit(1);
    if (existing)
      return c.json(
        {
          orderId: existing.id,
          storeId: existing.storeId,
          totalAmount: existing.totalAmount,
          status: existing.status,
        },
        201,
      );
  }

  const [address] = await db
    .select()
    .from(addresses)
    .where(
      and(
        eq(addresses.id, parsed.data.addressId),
        eq(addresses.userId, auth.sub),
      ),
    )
    .limit(1);
  if (!address) return c.json({ error: "Address not found" }, 404);

  const cartRows = await db
    .select({ cartItem: cartItems, product: products })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.userId, auth.sub));
  if (cartRows.length === 0) return c.json({ error: "Cart is empty" }, 400);
  if (cartRows.some((row) => !row.product.active))
    return c.json(
      {
        error:
          "A product in your cart is no longer available. Please remove it before checkout.",
      },
      409,
    );

  const productIds = cartRows.map((r) => r.product.id);
  const resolveCategory = await categorySettings(db);
  const activeShades = await db
    .select()
    .from(paintShades)
    .where(eq(paintShades.active, true));
  if (
    cartRows.some(
      ({ product, cartItem }) =>
        resolveCategory(product.categoryId)?.colourSelection &&
        (!cartItem.shade ||
          !activeShades.some((shade) => shade.id === cartItem.shadeId)),
    )
  )
    return c.json(
      {
        error:
          "Choose an available colour for each paint before checkout. Remove the affected item and add it again with a colour.",
      },
      409,
    );
  const tierRows = await db
    .select()
    .from(bulkPricingTiers)
    .where(inArray(bulkPricingTiers.productId, productIds));
  const tiersByProduct = new Map<string, typeof tierRows>();
  for (const tier of tierRows) {
    const list = tiersByProduct.get(tier.productId) ?? [];
    list.push(tier);
    tiersByProduct.set(tier.productId, list);
  }

  const lines = cartRows.map(({ cartItem, product }) => ({
    productId: product.id,
    productName: product.name,
    shade: cartItem.shade,
    quantity: cartItem.quantity,
    unitPrice: priceForQuantity(
      tiersByProduct.get(product.id) ?? [],
      cartItem.quantity,
      product.basePrice,
    ),
  }));

  const store = await findStoreWithStock(
    db,
    address.pincode,
    lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
  );
  if (!store) {
    return c.json(
      {
        error:
          "One or more items are unavailable for this delivery address or requested quantity.",
      },
      409,
    );
  }

  const orderId = crypto.randomUUID();
  const totalAmount =
    Math.round(
      lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) * 100,
    ) / 100;

  // Explicit BatchItem<'sqlite'>[] annotation: db.batch()'s own type wants a
  // non-empty tuple, which a dynamically-built array (spreads of per-line
  // inserts/updates) can't satisfy statically — cast through this instead
  // of `as any`.
  const cartFingerprint = cartRows
    .map(({ cartItem }) => `${cartItem.id}:${cartItem.quantity}`)
    .sort()
    .join("|");
  const statements: BatchItem<"sqlite">[] = [
    // The access check and checkout share the transaction. A deletion request
    // cannot race an already-authorized checkout and recreate personal data.
    db
      .update(users)
      .set({
        sessionVersion: sql`CASE WHEN ${users.active}=1 AND ${users.deletionRequestedAt} IS NULL AND ${users.sessionVersion}=${auth.sessionVersion ?? 0} THEN ${users.sessionVersion} ELSE NULL END`,
      })
      .where(eq(users.id, auth.sub)),
    // A cart can be shared across devices. Do not place it twice or discard edits
    // made between reading the cart and committing the reservation.
    db
      .update(users)
      .set({
        sessionVersion: sql`CASE WHEN
      (SELECT group_concat(value,'|') FROM (SELECT id || ':' || quantity AS value FROM cart_items WHERE user_id=${auth.sub} ORDER BY id))=${cartFingerprint}
      THEN ${users.sessionVersion} ELSE NULL END`,
      })
      .where(eq(users.id, auth.sub)),
    db.insert(orders).values({
      id: orderId,
      userId: auth.sub,
      storeId: store.storeId,
      addressId: address.id,
      status: "placed",
      paymentMethod: "cod",
      paymentStatus: "pending",
      totalAmount,
      checkoutKey: parsed.data.checkoutKey ?? null,
    }),
    ...lines.map((line) =>
      db.insert(orderItems).values({
        id: crypto.randomUUID(),
        orderId,
        productId: line.productId,
        productName: line.productName,
        shade: line.shade,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      }),
    ),
    db.insert(orderStatusEvents).values({
      id: crypto.randomUUID(),
      orderId,
      status: "placed",
      actorUserId: auth.sub,
    }),
    ...lines.map((line) =>
      db
        .update(inventory)
        // NULL violates stock_qty NOT NULL and aborts the entire D1 batch if a competing checkout took the last stock.
        .set({
          stockQty: sql`CASE WHEN ${inventory.stockQty} >= ${line.quantity} THEN ${inventory.stockQty} - ${line.quantity} ELSE NULL END`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventory.storeId, store.storeId),
            eq(inventory.productId, line.productId),
          ),
        ),
    ),
    db.delete(cartItems).where(eq(cartItems.userId, auth.sub)),
  ];
  try {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  } catch (error) {
    const detail = String(error) + String((error as { cause?: unknown }).cause);
    if (parsed.data.checkoutKey) {
      const [existing] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.userId, auth.sub),
            eq(orders.checkoutKey, parsed.data.checkoutKey),
          ),
        )
        .limit(1);
      if (existing)
        return c.json(
          {
            orderId: existing.id,
            storeId: existing.storeId,
            totalAmount: existing.totalAmount,
            status: existing.status,
          },
          201,
        );
    }
    if (detail.includes("NOT NULL") && detail.includes("session_version")) {
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, auth.sub))
        .limit(1);
      if (
        !currentUser?.active ||
        currentUser.sessionVersion !== (auth.sessionVersion ?? 0)
      )
        return c.json({ error: "Session expired. Please sign in again." }, 401);
      return c.json(
        {
          error: "Your cart changed during checkout. Review it and try again.",
        },
        409,
      );
    }
    if (detail.includes("NOT NULL") && detail.includes("stock_qty"))
      return c.json(
        {
          error:
            "An item became unavailable. Please review your cart and try again.",
        },
        409,
      );
    throw error;
  }
  c.executionCtx.waitUntil(notifyOrderStatus(c.env, orderId, "placed"));

  return c.json(
    { orderId, storeId: store.storeId, totalAmount, status: "placed" },
    201,
  );
});

orderRoutes.get("/", requireAuth, async (c) => {
  const auth = c.get("auth");
  const db = getDb(c.env.DB);

  if (auth.role === "customer") {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, auth.sub))
      .orderBy(desc(orders.createdAt));
    return c.json({ orders: rows });
  }

  if (auth.role === "admin") {
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return c.json({ orders: rows });
  }

  if (auth.role === "delivery_partner") {
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
    .where(eq(orders.storeId, auth.storeId ?? ""))
    .orderBy(desc(orders.createdAt));
  return c.json({ orders: rows });
});

// Recover a checkout whose response was lost without creating another order.
orderRoutes.get(
  "/checkout/:key",
  requireAuth,
  requireRole("customer"),
  async (c) => {
    if (!z.uuid().safeParse(c.req.param("key")).success)
      return c.json({ error: "Invalid checkout key" }, 400);
    const [order] = await getDb(c.env.DB)
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, c.get("auth").sub),
          eq(orders.checkoutKey, c.req.param("key")!),
        ),
      )
      .limit(1);
    return c.json({ orderId: order?.id ?? null });
  },
);

orderRoutes.get("/:id", requireAuth, async (c) => {
  const auth = c.get("auth");
  const db = getDb(c.env.DB);
  const id = c.req.param("id")!;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);

  const isOwnCustomerOrder =
    auth.role === "customer" && order.userId === auth.sub;
  const isScopedStoreStaff =
    auth.role === "store_staff" && order.storeId === auth.storeId;
  const isAssignedDeliveryPartner =
    auth.role === "delivery_partner" &&
    (
      await db
        .select()
        .from(deliveryAssignments)
        .where(
          and(
            eq(deliveryAssignments.orderId, id),
            eq(deliveryAssignments.deliveryPartnerUserId, auth.sub),
          ),
        )
        .limit(1)
    ).length > 0;

  if (
    !isOwnCustomerOrder &&
    !isScopedStoreStaff &&
    !isAssignedDeliveryPartner &&
    auth.role !== "admin"
  ) {
    return c.json({ error: "Order not found" }, 404);
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));
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

  const [address] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.id, order.addressId))
    .limit(1);
  const [customer] = await db
    .select({ name: users.name, phone: users.phone })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);
  return c.json({ order, items, events, delivery, address, customer });
});

const CANCELLABLE_STATUSES: OrderStatus[] = ["placed", "confirmed"];
const statusUpdateSchema = z.object({ status: z.enum(ORDER_STATUSES) });

orderRoutes.patch("/:id/status", requireAuth, async (c) => {
  const parsed = statusUpdateSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const auth = c.get("auth");
  const db = getDb(c.env.DB);
  const id = c.req.param("id")!;
  const targetStatus = parsed.data.status;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) return c.json({ error: "Order not found" }, 404);

  // Each role gets a narrow, explicit slice of the status machine — not the
  // same "any status, any order at my store" power staff/admin have.
  if (auth.role === "customer") {
    if (order.userId !== auth.sub)
      return c.json({ error: "Order not found" }, 404);
    if (targetStatus !== "cancelled") {
      return c.json({ error: "Customers can only cancel an order" }, 403);
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return c.json(
        { error: `Can't cancel an order that's already ${order.status}` },
        409,
      );
    }
  } else if (auth.role === "delivery_partner") {
    const [assignment] = await db
      .select()
      .from(deliveryAssignments)
      .where(
        and(
          eq(deliveryAssignments.orderId, id),
          eq(deliveryAssignments.deliveryPartnerUserId, auth.sub),
        ),
      )
      .limit(1);
    if (!assignment) return c.json({ error: "Order not found" }, 404);
    if (targetStatus !== "delivered") {
      return c.json(
        { error: "Delivery partners can only mark an order delivered" },
        403,
      );
    }
  } else if (auth.role === "store_staff") {
    if (order.storeId !== auth.storeId)
      return c.json({ error: "Forbidden" }, 403);
  } else if (auth.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (order.status === targetStatus)
    return c.json({ ok: true, status: targetStatus });
  const forward: OrderStatus[] = [
    "placed",
    "confirmed",
    "picked",
    "dispatched",
    "delivered",
  ];
  const allowed =
    targetStatus === "cancelled"
      ? CANCELLABLE_STATUSES.includes(order.status)
      : order.status !== "cancelled" &&
        forward[forward.indexOf(order.status) + 1] === targetStatus;
  if (!allowed)
    return c.json(
      {
        error: `Cannot move an order from ${order.status} to ${targetStatus}.`,
      },
      409,
    );

  const batchStatements: BatchItem<"sqlite">[] = [
    db
      .update(orders)
      .set({
        status: sql`CASE WHEN ${orders.status} = ${order.status} THEN ${targetStatus} ELSE NULL END`,
      })
      .where(eq(orders.id, id)),
    db.insert(orderStatusEvents).values({
      id: crypto.randomUUID(),
      orderId: id,
      status: targetStatus,
      actorUserId: auth.sub,
    }),
  ];

  // Cancelling gives back the stock that checkout reserved — otherwise
  // every cancellation permanently loses that inventory.
  if (targetStatus === "cancelled" && order.status !== "cancelled") {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    for (const item of items) {
      batchStatements.push(
        db
          .update(inventory)
          .set({
            stockQty: sql`${inventory.stockQty} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventory.storeId, order.storeId),
              eq(inventory.productId, item.productId),
            ),
          ),
      );
    }
  }

  if (targetStatus === "delivered") {
    batchStatements.push(
      db
        .update(deliveryAssignments)
        .set({ completedAt: new Date() })
        .where(eq(deliveryAssignments.orderId, id)),
    );
  }

  try {
    await db.batch(
      batchStatements as unknown as Parameters<typeof db.batch>[0],
    );
  } catch (error) {
    const detail = String(error) + String((error as { cause?: unknown }).cause);
    if (detail.includes("NOT NULL") && detail.includes("status"))
      return c.json(
        { error: "This order was just updated. Refresh and try again." },
        409,
      );
    throw error;
  }
  c.executionCtx.waitUntil(notifyOrderStatus(c.env, id, targetStatus));
  return c.json({ ok: true, status: targetStatus });
});

const assignDeliverySchema = z.object({ deliveryPartnerUserId: z.string() });

orderRoutes.patch(
  "/:id/assign-delivery",
  requireAuth,
  requireRole("store_staff", "admin"),
  async (c) => {
    const parsed = assignDeliverySchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
    const auth = c.get("auth");
    const db = getDb(c.env.DB);
    const id = c.req.param("id")!;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!order) return c.json({ error: "Order not found" }, 404);
    if (auth.role === "store_staff" && order.storeId !== auth.storeId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const [partner] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, parsed.data.deliveryPartnerUserId),
          eq(users.role, "delivery_partner"),
        ),
      )
      .limit(1);
    if (!partner) return c.json({ error: "Delivery partner not found" }, 404);
    if (partner.storeId !== order.storeId) {
      return c.json(
        { error: "That delivery partner isn't assigned to this order's store" },
        400,
      );
    }

    const [existing] = await db
      .select()
      .from(deliveryAssignments)
      .where(eq(deliveryAssignments.orderId, id))
      .limit(1);
    if (existing) {
      await db
        .update(deliveryAssignments)
        .set({
          deliveryPartnerUserId: partner.id,
          assignedAt: new Date(),
          completedAt: null,
        })
        .where(eq(deliveryAssignments.id, existing.id));
    } else {
      await db.insert(deliveryAssignments).values({
        id: crypto.randomUUID(),
        orderId: id,
        deliveryPartnerUserId: partner.id,
      });
    }

    return c.json({ ok: true });
  },
);

// Live order tracking over WebSocket — proxies straight through to that
// order's Durable Object (see durable-objects/OrderTrackerDO.ts). No auth
// middleware here deliberately: the order id itself (a UUID) is the
// capability — same trade-off as an unguessable tracking-link URL. Revisit
// if that's not an acceptable bar later.
orderRoutes.get("/:id/track", async (c) => {
  const id = c.req.param("id")!;
  const stubId = c.env.ORDER_TRACKER.idFromName(id);
  const stub = c.env.ORDER_TRACKER.get(stubId);
  return stub.fetch(c.req.raw);
});
