import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import {
  bulkPricingTiers,
  cartItems,
  categories,
  deliveryPincodes,
  orders,
  products,
  users,
} from '../db/schema';
import type { Env } from '../env';
import { signOwnerToken } from '../lib/jwt';
import { requireOwner } from '../middleware/owner';

export const ownerRoutes = new Hono<{ Bindings: Env }>();

const LOGIN_RATE_LIMIT_KEY = 'owner:login:attempts';
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_LOCKOUT_SECONDS = 15 * 60;

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

ownerRoutes.post('/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const { email, password } = parsed.data;

  const attempts = Number((await c.env.CACHE.get(LOGIN_RATE_LIMIT_KEY)) ?? '0');
  if (attempts >= LOGIN_MAX_ATTEMPTS) {
    return c.json({ error: 'Too many attempts — try again later' }, 429);
  }

  if (!c.env.OWNER_EMAIL || !c.env.OWNER_PASSWORD) {
    return c.json({ error: 'Owner login is not configured' }, 500);
  }

  const valid = email === c.env.OWNER_EMAIL && password === c.env.OWNER_PASSWORD;
  if (!valid) {
    await c.env.CACHE.put(LOGIN_RATE_LIMIT_KEY, String(attempts + 1), {
      expirationTtl: LOGIN_LOCKOUT_SECONDS,
    });
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  await c.env.CACHE.delete(LOGIN_RATE_LIMIT_KEY);
  return c.json({ ownerToken: await signOwnerToken(c.env) });
});

// Everything below requires a valid owner token.
const admin = new Hono<{ Bindings: Env }>();
admin.use('*', requireOwner);

// ---- Categories ----

admin.get('/categories', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(categories).orderBy(categories.sortOrder);
  return c.json({ categories: rows });
});

const categoryInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

admin.post('/categories', async (c) => {
  const parsed = categoryInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();
  await db.insert(categories).values({ id, ...parsed.data });
  return c.json({ success: true, id });
});

const categoryUpdateSchema = categoryInputSchema.partial();

admin.patch('/categories/:id', async (c) => {
  const parsed = categoryUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  await db.update(categories).set(parsed.data).where(eq(categories.id, c.req.param('id')));
  return c.json({ success: true });
});

admin.delete('/categories/:id', async (c) => {
  const db = getDb(c.env.DB);
  await db.delete(categories).where(eq(categories.id, c.req.param('id')));
  return c.json({ success: true });
});

// ---- Products ----

admin.get('/products', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  return c.json({ products: rows });
});

const productInputSchema = z.object({
  slug: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().min(1),
  basePrice: z.number().positive(),
  imageUrl: z.string().optional(),
  active: z.boolean().optional(),
});

admin.post('/products', async (c) => {
  const parsed = productInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();
  await db.insert(products).values({ id, ...parsed.data });
  return c.json({ success: true, id });
});

const productUpdateSchema = productInputSchema.partial();

admin.patch('/products/:id', async (c) => {
  const parsed = productUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  await db.update(products).set(parsed.data).where(eq(products.id, c.req.param('id')));
  return c.json({ success: true });
});

admin.delete('/products/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  // Clean up rows that reference the product so it doesn't linger as an
  // orphaned FK in other people's carts or pricing tiers.
  await db.delete(bulkPricingTiers).where(eq(bulkPricingTiers.productId, id));
  await db.delete(cartItems).where(eq(cartItems.productId, id));
  await db.delete(products).where(eq(products.id, id));
  return c.json({ success: true });
});

// ---- Bulk pricing tiers ----

const tierInputSchema = z.object({ minQty: z.number().int().positive(), pricePerUnit: z.number().positive() });

admin.get('/products/:id/tiers', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(bulkPricingTiers)
    .where(eq(bulkPricingTiers.productId, c.req.param('id')));
  return c.json({ bulkPricingTiers: rows });
});

admin.post('/products/:id/tiers', async (c) => {
  const parsed = tierInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const id = crypto.randomUUID();
  await db.insert(bulkPricingTiers).values({ id, productId: c.req.param('id'), ...parsed.data });
  return c.json({ success: true, id });
});

admin.delete('/tiers/:id', async (c) => {
  const db = getDb(c.env.DB);
  await db.delete(bulkPricingTiers).where(eq(bulkPricingTiers.id, c.req.param('id')));
  return c.json({ success: true });
});

// ---- Orders ----

admin.get('/orders', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({ order: orders, userPhone: users.phone })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));
  return c.json({ orders: rows.map((r) => ({ ...r.order, userPhone: r.userPhone })) });
});

const orderStatusUpdateSchema = z.object({
  status: z.enum(['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']),
});

admin.patch('/orders/:id', async (c) => {
  const parsed = orderStatusUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid status' }, 400);

  const db = getDb(c.env.DB);
  await db.update(orders).set({ status: parsed.data.status }).where(eq(orders.id, c.req.param('id')));
  return c.json({ success: true });
});

// ---- Delivery pincodes ----

admin.get('/pincodes', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(deliveryPincodes);
  return c.json({ pincodes: rows });
});

const pincodeInputSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  serviceable: z.boolean().optional(),
  etaMinutes: z.number().int().positive().optional(),
});

admin.post('/pincodes', async (c) => {
  const parsed = pincodeInputSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  const db = getDb(c.env.DB);
  const { pincode, ...rest } = parsed.data;
  await db
    .insert(deliveryPincodes)
    .values({ pincode, ...rest })
    .onConflictDoUpdate({ target: deliveryPincodes.pincode, set: rest });
  return c.json({ success: true });
});

admin.delete('/pincodes/:pincode', async (c) => {
  const db = getDb(c.env.DB);
  await db.delete(deliveryPincodes).where(eq(deliveryPincodes.pincode, c.req.param('pincode')));
  return c.json({ success: true });
});

ownerRoutes.route('/', admin);
