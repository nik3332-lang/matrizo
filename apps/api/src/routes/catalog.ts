import { and, asc, eq, inArray } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { bulkPricingTiers, cartItems, categories, inventory, orderItems, products } from '../db/schema';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';
import type { Env } from '../env';

export const catalogRoutes = new Hono<AuthEnv>();

// --- public reads ---------------------------------------------------------

catalogRoutes.get('/categories', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  return c.json({ categories: rows });
});

catalogRoutes.get('/categories/:slug/products', async (c) => {
  const db = getDb(c.env.DB);
  const slug = c.req.param('slug');

  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!category) return c.json({ error: 'Category not found' }, 404);

  const productRows = await db
    .select()
    .from(products)
    .where(and(eq(products.categoryId, category.id), eq(products.active, true)));

  const withTiers = await attachTiers(db, productRows);
  return c.json({ category, products: withTiers });
});

catalogRoutes.get('/products/:slug', async (c) => {
  const db = getDb(c.env.DB);
  const slug = c.req.param('slug');

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return c.json({ error: 'Product not found' }, 404);

  const tiers = await db.select().from(bulkPricingTiers).where(eq(bulkPricingTiers.productId, product.id));
  return c.json({ product: { ...product, tiers } });
});

// One bulk query for all products' tiers (rather than N+1 per product) — fine
// at any catalog size we'll hit before this needs revisiting.
async function attachTiers(db: ReturnType<typeof getDb>, productRows: (typeof products.$inferSelect)[]) {
  if (productRows.length === 0) return [];

  const productIds = productRows.map((p) => p.id);
  const tierRows = await db.select().from(bulkPricingTiers).where(inArray(bulkPricingTiers.productId, productIds));

  const tiersByProduct = new Map<string, typeof tierRows>();
  for (const tier of tierRows) {
    const list = tiersByProduct.get(tier.productId) ?? [];
    list.push(tier);
    tiersByProduct.set(tier.productId, list);
  }

  return productRows.map((product) => ({
    ...product,
    tiers: tiersByProduct.get(product.id) ?? [],
  }));
}

// D1/SQLite unique-constraint violations (duplicate slug/sku) throw rather
// than returning a result Drizzle can inspect — without this, they'd surface
// as a raw 500 instead of a message an admin can act on. (Confirmed via a
// real duplicate-slug attempt during testing: it 500'd before this existed.)
function uniqueConstraintMessage(err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.includes('UNIQUE constraint failed')) return null;
  if (message.includes('categories.slug')) return 'A category with this slug already exists.';
  if (message.includes('products.slug')) return 'A product with this slug already exists.';
  if (message.includes('products.sku')) return 'A product with this SKU already exists.';
  return 'That value is already in use.';
}

// --- admin: catalog management ---------------------------------------------

catalogRoutes.use('/admin/*', requireAuth, requireRole('admin'));

// All products, any active state, with category + tiers — the customer-
// facing GETs above deliberately filter to active-only and are scoped per
// category, neither of which fits a management table.
catalogRoutes.get('/admin/products', async (c) => {
  const db = getDb(c.env.DB);
  const productRows = await db.select().from(products);
  const withTiers = await attachTiers(db, productRows);
  return c.json({ products: withTiers });
});

const categorySchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  icon: z.string().trim().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

catalogRoutes.post('/admin/categories', async (c) => {
  const parsed = categorySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();
  try {
    await db.insert(categories).values({
      id,
      slug: parsed.data.slug,
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      parentId: parsed.data.parentId ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
  } catch (err) {
    const message = uniqueConstraintMessage(err);
    if (message) return c.json({ error: message }, 409);
    throw err;
  }

  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return c.json({ category }, 201);
});

catalogRoutes.patch('/admin/categories/:id', async (c) => {
  const parsed = categorySchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;
  const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Category not found' }, 404);

  try {
    await db.update(categories).set(parsed.data).where(eq(categories.id, id));
  } catch (err) {
    const message = uniqueConstraintMessage(err);
    if (message) return c.json({ error: message }, 409);
    throw err;
  }
  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return c.json({ category });
});

catalogRoutes.delete('/admin/categories/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;

  const [inUse] = await db.select().from(products).where(eq(products.categoryId, id)).limit(1);
  if (inUse) {
    return c.json({ error: 'Category still has products — move or delete those first' }, 409);
  }

  await db.delete(categories).where(eq(categories.id, id));
  return c.json({ ok: true });
});

const tierInputSchema = z.object({ minQty: z.number().int().positive(), pricePerUnit: z.number().positive() });
const productSchema = z.object({
  sku: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  categoryId: z.string(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  unit: z.string().trim().min(1),
  basePrice: z.number().positive(),
  imageUrl: z.string().trim().optional(),
  active: z.boolean().optional(),
  tiers: z.array(tierInputSchema).optional(),
});

catalogRoutes.post('/admin/products', async (c) => {
  const parsed = productSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const { tiers, ...productData } = parsed.data;

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();

  const statements: BatchItem<'sqlite'>[] = [
    db.insert(products).values({
      id,
      sku: productData.sku,
      slug: productData.slug,
      categoryId: productData.categoryId,
      name: productData.name,
      description: productData.description ?? null,
      unit: productData.unit,
      basePrice: productData.basePrice,
      imageUrl: productData.imageUrl ?? null,
      active: productData.active ?? true,
    }),
    ...(tiers ?? []).map((tier) =>
      db.insert(bulkPricingTiers).values({ id: crypto.randomUUID(), productId: id, ...tier })
    ),
  ];
  try {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  } catch (err) {
    const message = uniqueConstraintMessage(err);
    if (message) return c.json({ error: message }, 409);
    throw err;
  }

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const tierRows = await db.select().from(bulkPricingTiers).where(eq(bulkPricingTiers.productId, id));
  return c.json({ product: { ...product, tiers: tierRows } }, 201);
});

catalogRoutes.patch('/admin/products/:id', async (c) => {
  const parsed = productSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const { tiers, ...productData } = parsed.data;

  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;
  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Product not found' }, 404);

  const statements: BatchItem<'sqlite'>[] = [];
  if (Object.keys(productData).length > 0) {
    statements.push(db.update(products).set(productData).where(eq(products.id, id)));
  }
  // Tiers, when provided, fully replace the existing set — simplest correct
  // model for "edit this product's pricing tiers" as one form submission,
  // rather than a diff/patch API for a handful of rows.
  if (tiers) {
    statements.push(db.delete(bulkPricingTiers).where(eq(bulkPricingTiers.productId, id)));
    statements.push(
      ...tiers.map((tier) => db.insert(bulkPricingTiers).values({ id: crypto.randomUUID(), productId: id, ...tier }))
    );
  }
  if (statements.length > 0) {
    try {
      await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
    } catch (err) {
      const message = uniqueConstraintMessage(err);
      if (message) return c.json({ error: message }, 409);
      throw err;
    }
  }

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const tierRows = await db.select().from(bulkPricingTiers).where(eq(bulkPricingTiers.productId, id));
  return c.json({ product: { ...product, tiers: tierRows } });
});

catalogRoutes.delete('/admin/products/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;

  const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) return c.json({ error: 'Product not found' }, 404);

  // D1 enforces the order_items -> products foreign key (confirmed: this
  // used to attempt a hard delete regardless and 500'd on any product with
  // order history), and order_items has no ON DELETE behavior — nor should
  // it, since its productName snapshot is what keeps past orders readable
  // once a product changes or disappears. So: deactivate instead of
  // deleting when the product has ever been ordered (same effect from a
  // customer's perspective — it disappears from the catalog immediately —
  // without breaking referential integrity for order history). Only
  // products with no order history get a real hard delete.
  const [orderItemUsingProduct] = await db.select().from(orderItems).where(eq(orderItems.productId, id)).limit(1);

  if (orderItemUsingProduct) {
    await db.update(products).set({ active: false }).where(eq(products.id, id));
    return c.json({ ok: true, deactivatedInstead: true });
  }

  await db.batch([
    db.delete(bulkPricingTiers).where(eq(bulkPricingTiers.productId, id)),
    db.delete(inventory).where(eq(inventory.productId, id)),
    db.delete(cartItems).where(eq(cartItems.productId, id)),
    db.delete(products).where(eq(products.id, id)),
  ] as unknown as Parameters<typeof db.batch>[0]);

  return c.json({ ok: true, deactivatedInstead: false });
});
