import { and, asc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';

import { getDb } from '../db/client';
import { bulkPricingTiers, categories, products } from '../db/schema';
import type { Env } from '../env';

export const catalogRoutes = new Hono<{ Bindings: Env }>();

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

  const tiers = await attachTiers(db, productRows);
  return c.json({ category, products: tiers });
});

catalogRoutes.get('/products/:slug', async (c) => {
  const db = getDb(c.env.DB);
  const slug = c.req.param('slug');

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return c.json({ error: 'Product not found' }, 404);

  const tiers = await db
    .select()
    .from(bulkPricingTiers)
    .where(eq(bulkPricingTiers.productId, product.id));

  return c.json({ product: { ...product, tiers } });
});

// One bulk query for all products' tiers (rather than N+1 per product) — fine
// at any catalog size we'll hit before this needs revisiting.
async function attachTiers(db: ReturnType<typeof getDb>, productRows: (typeof products.$inferSelect)[]) {
  if (productRows.length === 0) return [];

  const productIds = productRows.map((p) => p.id);
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

  return productRows.map((product) => ({
    ...product,
    tiers: tiersByProduct.get(product.id) ?? [],
  }));
}
