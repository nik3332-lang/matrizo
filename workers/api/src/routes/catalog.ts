import { and, asc, eq, like } from 'drizzle-orm';
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

  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.categoryId, category.id), eq(products.active, true)));

  return c.json({ category, products: rows });
});

// Registered before /products/:id so "search" isn't swallowed as an :id param.
catalogRoutes.get('/products/search', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q) return c.json({ products: [] });

  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.active, true), like(products.name, `%${q}%`)));

  return c.json({ products: rows });
});

catalogRoutes.get('/products/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');

  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return c.json({ error: 'Product not found' }, 404);

  const tiers = await db
    .select()
    .from(bulkPricingTiers)
    .where(eq(bulkPricingTiers.productId, id))
    .orderBy(asc(bulkPricingTiers.minQty));

  return c.json({ product, bulkPricingTiers: tiers });
});
