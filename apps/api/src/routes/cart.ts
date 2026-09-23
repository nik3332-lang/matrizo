import { and, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { priceForQuantity } from "@matrizo/shared";
import { getDb } from "../db/client";
import {
  bulkPricingTiers,
  cartItems,
  products,
  paintShades,
} from "../db/schema";
import { categorySettings } from "../lib/categorySettings";
import { requireAuth, requireRole, type AuthEnv } from "../middleware/auth";

export const cartRoutes = new Hono<AuthEnv>();

cartRoutes.use("*", requireAuth, requireRole("customer"));

async function serializeCart(db: ReturnType<typeof getDb>, userId: string) {
  const rows = await db
    .select({ cartItem: cartItems, product: products })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.userId, userId));

  const productIds = rows.map((r) => r.product.id);
  const tierRows = productIds.length
    ? await db
        .select()
        .from(bulkPricingTiers)
        .where(inArray(bulkPricingTiers.productId, productIds))
    : [];

  const tiersByProduct = new Map<string, typeof tierRows>();
  for (const tier of tierRows) {
    const list = tiersByProduct.get(tier.productId) ?? [];
    list.push(tier);
    tiersByProduct.set(tier.productId, list);
  }

  const items = rows.map(({ cartItem, product }) => {
    const unitPrice = priceForQuantity(
      tiersByProduct.get(product.id) ?? [],
      cartItem.quantity,
      product.basePrice,
    );
    return {
      id: cartItem.id,
      shadeId: cartItem.shadeId,
      shade: cartItem.shade,
      product,
      quantity: cartItem.quantity,
      unitPrice,
      lineTotal: unitPrice * cartItem.quantity,
    };
  });

  return {
    items,
    subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

cartRoutes.get("/", async (c) => {
  const auth = c.get("auth");
  return c.json(await serializeCart(getDb(c.env.DB), auth.sub));
});

const addItemSchema = z.object({
  productId: z.string(),
  shadeId: z.string().max(100).optional(),
  quantity: z.number().int().positive().max(9999),
});

cartRoutes.post("/items", async (c) => {
  const parsed = addItemSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { productId, quantity, shadeId = "" } = parsed.data;
  const auth = c.get("auth");
  const db = getDb(c.env.DB);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product || !product.active)
    return c.json({ error: "Product not found" }, 404);

  const settings = (await categorySettings(db))(product.categoryId);
  const [shade] = shadeId
    ? await db
        .select()
        .from(paintShades)
        .where(and(eq(paintShades.id, shadeId), eq(paintShades.active, true)))
        .limit(1)
    : [];
  if (settings?.colourSelection && !shade)
    return c.json({ error: "Choose an available paint colour." }, 400);
  if (shadeId && (!settings?.colourSelection || !shade))
    return c.json(
      { error: "This colour is not available for this product." },
      400,
    );
  const snapshot = shade
    ? JSON.stringify({
        id: shade.id,
        family: shade.family,
        name: shade.name,
        hex: shade.hex,
      })
    : null;

  const inserted = await c.env.DB.prepare(
    `INSERT INTO cart_items (id,user_id,product_id,quantity,shade_id,shade)
    SELECT ?,id,?,?,?,? FROM users WHERE id=? AND active=1 AND deletion_requested_at IS NULL AND session_version=?
    AND ((SELECT count(*) FROM cart_items WHERE user_id=?)<50 OR EXISTS(SELECT 1 FROM cart_items WHERE user_id=? AND product_id=? AND shade_id=?))
    AND COALESCE((SELECT quantity FROM cart_items WHERE user_id=? AND product_id=? AND shade_id=?),0)+?<=9999
    ON CONFLICT(user_id,product_id,shade_id) DO UPDATE SET quantity=cart_items.quantity+excluded.quantity, shade=excluded.shade RETURNING id`,
  )
    .bind(
      crypto.randomUUID(),
      productId,
      quantity,
      shadeId,
      snapshot,
      auth.sub,
      auth.sessionVersion ?? 0,
      auth.sub,
      auth.sub,
      productId,
      shadeId,
      auth.sub,
      productId,
      shadeId,
      quantity,
    )
    .all();
  if (!inserted.results.length)
    return c.json(
      {
        error:
          "Your cart limit was reached or your session expired. Use up to 50 different items and 9999 units per item.",
      },
      409,
    );

  return c.json(await serializeCart(db, auth.sub));
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0).max(9999),
});

cartRoutes.patch("/items/:productId", async (c) => {
  const parsed = updateItemSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const auth = c.get("auth");
  const db = getDb(c.env.DB);
  const productId = c.req.param("productId");

  if (parsed.data.quantity === 0) {
    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.userId, auth.sub),
          eq(cartItems.productId, productId),
          eq(cartItems.shadeId, c.req.query("shadeId") ?? ""),
          sql`EXISTS(SELECT 1 FROM users WHERE id=${auth.sub} AND active=1 AND deletion_requested_at IS NULL AND session_version=${auth.sessionVersion ?? 0})`,
        ),
      );
  } else {
    await db
      .update(cartItems)
      .set({ quantity: parsed.data.quantity })
      .where(
        and(
          eq(cartItems.userId, auth.sub),
          eq(cartItems.productId, productId),
          eq(cartItems.shadeId, c.req.query("shadeId") ?? ""),
          sql`EXISTS(SELECT 1 FROM users WHERE id=${auth.sub} AND active=1 AND deletion_requested_at IS NULL AND session_version=${auth.sessionVersion ?? 0})`,
        ),
      );
  }

  return c.json(await serializeCart(db, auth.sub));
});

cartRoutes.delete("/items/:productId", async (c) => {
  const auth = c.get("auth");
  const db = getDb(c.env.DB);
  const productId = c.req.param("productId");

  await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.userId, auth.sub),
        eq(cartItems.productId, productId),
        eq(cartItems.shadeId, c.req.query("shadeId") ?? ""),
        sql`EXISTS(SELECT 1 FROM users WHERE id=${auth.sub} AND active=1 AND deletion_requested_at IS NULL AND session_version=${auth.sessionVersion ?? 0})`,
      ),
    );
  return c.json(await serializeCart(db, auth.sub));
});
