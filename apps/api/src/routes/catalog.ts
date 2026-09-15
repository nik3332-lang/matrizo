import { and, asc, count, eq, inArray, like, or } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { Hono } from 'hono';
import { z } from 'zod';

import { PRODUCT_BRANDS, type ProductBrand } from '@matrizo/shared';
import { getDb } from '../db/client';
import { bulkPricingTiers, cartItems, categories, inventory, orderItems, products, stores } from '../db/schema';
import { findServiceableStore } from '../lib/serviceability';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';
import type { Env } from '../env';

export const catalogRoutes = new Hono<AuthEnv>();

// Brand is a fixed enum (unlike categories, which are admin-managed rows),
// so there's no `brands` table — this is just the display label for each.
const BRAND_LABELS: Record<ProductBrand, string> = {
  raksha: 'Raksha',
  prince: 'Prince',
  asian_paints: 'Asian Paints',
  birla_opus: 'Birla Opus',
  padmavati: 'Padmavati',
  others: 'Others',
};

// --- public reads ---------------------------------------------------------

catalogRoutes.get('/categories', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  return c.json({ categories: rows });
});

// Fixed brand list (with a live count of active products per brand, so the
// UI can hide/grey out an empty brand rather than guess).
catalogRoutes.get('/brands', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({ brand: products.brand, count: count() })
    .from(products)
    .where(eq(products.active, true))
    .groupBy(products.brand);
  const counts = new Map(rows.map((r) => [r.brand, r.count]));

  return c.json({
    brands: PRODUCT_BRANDS.map((brand) => ({ brand, name: BRAND_LABELS[brand], productCount: counts.get(brand) ?? 0 })),
  });
});

catalogRoutes.get('/brands/:brand/products', async (c) => {
  const brand = c.req.param('brand') as ProductBrand;
  if (!PRODUCT_BRANDS.includes(brand)) return c.json({ error: 'Unknown brand' }, 404);

  const db = getDb(c.env.DB);
  const productRows = await db
    .select()
    .from(products)
    .where(and(eq(products.brand, brand), eq(products.active, true)));

  const withTiers = await attachTiers(db, productRows);
  return c.json({ brand: { brand, name: BRAND_LABELS[brand] }, products: withTiers });
});

catalogRoutes.get('/categories/:slug/products', async (c) => {
  const db = getDb(c.env.DB);
  const slug = c.req.param('slug');
  const brand = c.req.query('brand');

  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!category) return c.json({ error: 'Category not found' }, 404);

  const conditions = [eq(products.categoryId, category.id), eq(products.active, true)];
  if (brand && PRODUCT_BRANDS.includes(brand as ProductBrand)) conditions.push(eq(products.brand, brand as ProductBrand));

  const productRows = await db
    .select()
    .from(products)
    .where(and(...conditions));

  const withTiers = await attachTiers(db, productRows);
  return c.json({ category, products: withTiers });
});

// Product search by name or SKU. Simple LIKE match — fine at this catalog
// size; if it ever gets slow, that's what D1's FTS5 extension or a proper
// search index is for, not a reason to build one preemptively now.
// Must be registered before /products/:slug — otherwise Hono matches
// "search" itself as the :slug param and this is never reached (confirmed
// via a real 404 "Product not found" during testing).
catalogRoutes.get('/products/search', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q) return c.json({ products: [] });
  const brand = c.req.query('brand');

  const db = getDb(c.env.DB);
  const pattern = `%${q}%`;
  const conditions = [eq(products.active, true), or(like(products.name, pattern), like(products.sku, pattern))!];
  if (brand && PRODUCT_BRANDS.includes(brand as ProductBrand)) conditions.push(eq(products.brand, brand as ProductBrand));

  const productRows = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .limit(30);

  const withTiers = await attachTiers(db, productRows);
  return c.json({ products: withTiers });
});

// Stock is deliberately only returned when a `pincode` is given: without
// one there's no way to know which store would fulfil the order, and
// guessing (e.g. "in stock somewhere") would be worse than saying
// nothing. The web app passes the pincode it already has from the header
// location bar (lib/location.tsx) once one is set.
catalogRoutes.get('/products/:slug', async (c) => {
  const db = getDb(c.env.DB);
  const slug = c.req.param('slug');
  const pincode = c.req.query('pincode');

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return c.json({ error: 'Product not found' }, 404);

  const [category] = await db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1);
  const tiers = await db.select().from(bulkPricingTiers).where(eq(bulkPricingTiers.productId, product.id));

  let stock: { storeName: string; stockQty: number; etaMinutes: number } | null = null;
  if (pincode) {
    const match = await findServiceableStore(db, pincode);
    if (match) {
      const [row] = await db
        .select({ stockQty: inventory.stockQty, storeName: stores.name })
        .from(inventory)
        .innerJoin(stores, eq(stores.id, inventory.storeId))
        .where(and(eq(inventory.storeId, match.storeId), eq(inventory.productId, product.id)))
        .limit(1);
      if (row) stock = { storeName: row.storeName, stockQty: row.stockQty, etaMinutes: match.etaMinutes };
    }
  }

  return c.json({
    product: {
      ...product,
      tiers,
      category: category ? { id: category.id, slug: category.slug, name: category.name } : null,
      stock,
    },
  });
});

// Separate from the main product GET so the client-side "what's in stock
// near me" check (apps/web's AddToCartPanel, which only knows the
// customer's pincode after the page has already hydrated) doesn't need to
// re-fetch and re-send the whole product payload just to learn this.
catalogRoutes.get('/products/:slug/stock', async (c) => {
  const slug = c.req.param('slug');
  const pincode = c.req.query('pincode');
  if (!pincode) return c.json({ stock: null });

  const db = getDb(c.env.DB);
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return c.json({ stock: null });

  const match = await findServiceableStore(db, pincode);
  if (!match) return c.json({ stock: null });

  const [row] = await db
    .select({ stockQty: inventory.stockQty, storeName: stores.name })
    .from(inventory)
    .innerJoin(stores, eq(stores.id, inventory.storeId))
    .where(and(eq(inventory.storeId, match.storeId), eq(inventory.productId, product.id)))
    .limit(1);

  return c.json({ stock: row ? { storeName: row.storeName, stockQty: row.stockQty, etaMinutes: match.etaMinutes } : null });
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

// Mirrors ProductSpecs in db/schema.ts — every field optional, since
// which ones apply depends on the category (a paint has no `material`, a
// pipe fitting has no `finish`/`coverageSqFtPerLitre`). The admin form
// decides which subset to show per category; the API just validates
// whatever's sent.
const productSpecsSchema = z
  .object({
    volumeLitres: z.number().positive().optional(),
    finish: z.enum(['matt', 'satin', 'gloss', 'enamel', 'primer']).optional(),
    surface: z.enum(['interior', 'exterior', 'both']).optional(),
    coverageSqFtPerLitre: z.number().positive().optional(),
    size: z.string().trim().optional(),
    material: z.string().trim().optional(),
    classOrStandard: z.string().trim().optional(),
    packQuantity: z.number().int().positive().optional(),
  })
  .optional();

const productSchema = z.object({
  sku: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  categoryId: z.string(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  unit: z.string().trim().min(1),
  basePrice: z.number().positive(),
  imageUrl: z.string().trim().optional(),
  brand: z.enum(PRODUCT_BRANDS).optional(),
  specs: productSpecsSchema,
  gstInvoiceEligible: z.boolean().optional(),
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
      brand: productData.brand ?? 'others',
      specs: productData.specs ?? null,
      gstInvoiceEligible: productData.gstInvoiceEligible ?? false,
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

// Bulk import — the whole reason this exists is that adding a real catalog
// one product at a time via the form is fine at dozens of SKUs, painful at
// hundreds. Each row is inserted independently (not one D1 batch) so one
// bad row (duplicate SKU, say) doesn't fail the whole import — the response
// reports success/failure per row so the admin can see exactly what to fix.
const bulkProductSchema = z.array(productSchema);

catalogRoutes.post('/admin/products/bulk', async (c) => {
  const parsed = bulkProductSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request — expected an array of products' }, 400);

  const db = getDb(c.env.DB);
  const results: { row: number; sku: string; ok: boolean; error?: string }[] = [];

  for (const [i, item] of parsed.data.entries()) {
    const { tiers, ...productData } = item;
    const id = crypto.randomUUID();
    try {
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
          brand: productData.brand ?? 'others',
          specs: productData.specs ?? null,
          gstInvoiceEligible: productData.gstInvoiceEligible ?? false,
          active: productData.active ?? true,
        }),
        ...(tiers ?? []).map((tier) =>
          db.insert(bulkPricingTiers).values({ id: crypto.randomUUID(), productId: id, ...tier })
        ),
      ];
      await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
      results.push({ row: i, sku: item.sku, ok: true });
    } catch (err) {
      const message = uniqueConstraintMessage(err) ?? (err instanceof Error ? err.message : 'Unknown error');
      results.push({ row: i, sku: item.sku, ok: false, error: message });
    }
  }

  return c.json({
    imported: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
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
