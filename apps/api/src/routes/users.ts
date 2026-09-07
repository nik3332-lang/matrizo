import { and, eq, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import type { UserRole } from '@matrizo/shared';
import { getDb } from '../db/client';
import { users } from '../db/schema';
import { hashPassword } from '../lib/password';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';

// Staff account management — store_staff, delivery_partner, and (rarely)
// other admin accounts. Never customers: those come in exclusively through
// phone-OTP self-signup in routes/auth.ts.
export const userRoutes = new Hono<AuthEnv>();

userRoutes.use('*', requireAuth, requireRole('store_staff', 'admin'));

const STAFF_ROLES: UserRole[] = ['store_staff', 'delivery_partner', 'admin'];

// Admin sees the full roster; store_staff only needs this to find delivery
// partners at their own store to assign orders to, so they get a narrower
// slice — their own store's delivery_partners, not every admin/other
// store's staff.
userRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const rows =
    auth.role === 'admin'
      ? await db.select().from(users).where(ne(users.role, 'customer'))
      : await db
          .select()
          .from(users)
          .where(and(eq(users.role, 'delivery_partner'), eq(users.storeId, auth.storeId ?? '')));

  return c.json({
    users: rows.map((u) => ({
      id: u.id,
      role: u.role,
      email: u.email,
      name: u.name,
      storeId: u.storeId,
      active: u.active,
    })),
  });
});

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1),
  role: z.enum(STAFF_ROLES as [UserRole, ...UserRole[]]),
  storeId: z.string().optional(),
});

userRoutes.post('/', requireRole('admin'), async (c) => {
  const parsed = createUserSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
  const { email, password, name, role, storeId } = parsed.data;

  if ((role === 'store_staff' || role === 'delivery_partner') && !storeId) {
    return c.json({ error: 'Store staff and delivery partners must be assigned a store' }, 400);
  }

  const db = getDb(c.env.DB);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return c.json({ error: 'A user with this email already exists' }, 409);

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await db.insert(users).values({
    id,
    role,
    email,
    passwordHash,
    name,
    storeId: role === 'admin' ? null : (storeId ?? null),
  });

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return c.json({ user: { id: user.id, role: user.role, email: user.email, name: user.name, storeId: user.storeId } }, 201);
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  storeId: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

userRoutes.patch('/:id', requireRole('admin'), async (c) => {
  const parsed = updateUserSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const db = getDb(c.env.DB);
  const id = c.req.param('id')!;

  const [existing] = await db.select().from(users).where(and(eq(users.id, id), ne(users.role, 'customer'))).limit(1);
  if (!existing) return c.json({ error: 'User not found' }, 404);

  const { password, ...rest } = parsed.data;
  const update: Partial<typeof users.$inferInsert> = { ...rest };
  if (password) update.passwordHash = await hashPassword(password);

  await db.update(users).set(update).where(eq(users.id, id));
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return c.json({
    user: { id: user.id, role: user.role, email: user.email, name: user.name, storeId: user.storeId, active: user.active },
  });
});
