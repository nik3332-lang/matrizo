import { and, desc, eq, gte, lte, sum } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { employeeProfiles, salesEntries, users } from '../db/schema';
import { hashPassword } from '../lib/password';
import { requireAuth, requireRole, type AuthEnv } from '../middleware/auth';

// Sales-employee self-service (day-wise sales entry, profile, commission)
// and the admin-side employee/commission management for the emp.matrizo.com
// portal. Commission is a flat per-employee percentage of each day's sales
// amount (employeeProfiles.commissionRatePercent), not slab-based — see the
// schema comment for why.
export const employeeRoutes = new Hono<AuthEnv>();
export const employeeAdminRoutes = new Hono<AuthEnv>();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function commissionFor(amount: number, ratePercent: number) {
  return Math.round(amount * (ratePercent / 100) * 100) / 100;
}

async function loadProfile(db: ReturnType<typeof getDb>, userId: string) {
  const [row] = await db
    .select()
    .from(users)
    .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

async function commissionSummary(db: ReturnType<typeof getDb>, userId: string, ratePercent: number) {
  const [totals] = await db
    .select({ totalSales: sum(salesEntries.amount) })
    .from(salesEntries)
    .where(eq(salesEntries.userId, userId));
  const totalSales = Number(totals?.totalSales ?? 0);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [monthTotals] = await db
    .select({ totalSales: sum(salesEntries.amount) })
    .from(salesEntries)
    .where(and(eq(salesEntries.userId, userId), gte(salesEntries.date, `${monthPrefix}-01`), lte(salesEntries.date, `${monthPrefix}-31`)));
  const monthSales = Number(monthTotals?.totalSales ?? 0);

  return {
    commissionRatePercent: ratePercent,
    totalSales,
    totalCommission: commissionFor(totalSales, ratePercent),
    currentMonth: monthPrefix,
    monthSales,
    monthCommission: commissionFor(monthSales, ratePercent),
  };
}

// --- self-service: /employees/me -------------------------------------------

employeeRoutes.use('*', requireAuth, requireRole('sales_employee'));

employeeRoutes.get('/me', async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const row = await loadProfile(db, auth.sub);
  if (!row) return c.json({ error: 'Profile not found' }, 404);

  const summary = await commissionSummary(db, auth.sub, row.employee_profiles.commissionRatePercent);
  return c.json({
    employee: {
      id: row.users.id,
      email: row.users.email,
      name: row.users.name,
      phone: row.employee_profiles.phone,
      contactAddress: row.employee_profiles.contactAddress,
      joinedAt: row.employee_profiles.joinedAt,
    },
    commission: summary,
  });
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  contactAddress: z.string().trim().optional(),
});

// Employees can keep their own contact details current; email and
// commission rate stay admin-only (see PATCH /admin/employees/:id).
employeeRoutes.patch('/me', async (c) => {
  const parsed = updateProfileSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const { name, ...profileFields } = parsed.data;

  if (name) await db.update(users).set({ name }).where(eq(users.id, auth.sub));
  if (Object.keys(profileFields).length > 0) {
    await db.update(employeeProfiles).set(profileFields).where(eq(employeeProfiles.userId, auth.sub));
  }

  const row = await loadProfile(db, auth.sub);
  return c.json({
    employee: {
      id: row!.users.id,
      email: row!.users.email,
      name: row!.users.name,
      phone: row!.employee_profiles.phone,
      contactAddress: row!.employee_profiles.contactAddress,
      joinedAt: row!.employee_profiles.joinedAt,
    },
  });
});

employeeRoutes.get('/me/sales', async (c) => {
  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const month = c.req.query('month'); // 'YYYY-MM', optional filter

  const conditions = [eq(salesEntries.userId, auth.sub)];
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    conditions.push(gte(salesEntries.date, `${month}-01`), lte(salesEntries.date, `${month}-31`));
  }

  const rows = await db
    .select()
    .from(salesEntries)
    .where(and(...conditions))
    .orderBy(desc(salesEntries.date));
  return c.json({ entries: rows });
});

const upsertSalesSchema = z.object({
  amount: z.number().nonnegative(),
  notes: z.string().trim().optional(),
});

// One entry per employee per day — add and update are the same call
// (upsert on the (userId, date) unique index), matching "add/update daily
// sales data" from the product ask rather than needing separate endpoints.
employeeRoutes.put('/me/sales/:date', async (c) => {
  const date = c.req.param('date')!;
  if (!DATE_RE.test(date)) return c.json({ error: 'date must be YYYY-MM-DD' }, 400);
  const parsed = upsertSalesSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);

  const auth = c.get('auth');
  const db = getDb(c.env.DB);
  const [existing] = await db
    .select()
    .from(salesEntries)
    .where(and(eq(salesEntries.userId, auth.sub), eq(salesEntries.date, date)))
    .limit(1);

  if (existing) {
    await db
      .update(salesEntries)
      .set({ amount: parsed.data.amount, notes: parsed.data.notes ?? null, updatedAt: new Date() })
      .where(eq(salesEntries.id, existing.id));
  } else {
    await db.insert(salesEntries).values({
      id: crypto.randomUUID(),
      userId: auth.sub,
      date,
      amount: parsed.data.amount,
      notes: parsed.data.notes ?? null,
    });
  }

  const [entry] = await db
    .select()
    .from(salesEntries)
    .where(and(eq(salesEntries.userId, auth.sub), eq(salesEntries.date, date)))
    .limit(1);
  return c.json({ entry });
});

// --- admin: /admin/employees -------------------------------------------

employeeAdminRoutes.use('*', requireAuth, requireRole('admin'));

employeeAdminRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(users)
    .innerJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .where(eq(users.role, 'sales_employee'));

  const employees = await Promise.all(
    rows.map(async (row) => ({
      id: row.users.id,
      email: row.users.email,
      name: row.users.name,
      active: row.users.active,
      phone: row.employee_profiles.phone,
      commission: await commissionSummary(db, row.users.id, row.employee_profiles.commissionRatePercent),
    }))
  );
  return c.json({ employees });
});

const createEmployeeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  commissionRatePercent: z.number().positive().optional(),
});

employeeAdminRoutes.post('/', async (c) => {
  const parsed = createEmployeeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
  const { email, password, name, phone, commissionRatePercent } = parsed.data;

  const db = getDb(c.env.DB);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return c.json({ error: 'A user with this email already exists' }, 409);

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ id, role: 'sales_employee', email, passwordHash, name });
  await db.insert(employeeProfiles).values({
    userId: id,
    phone: phone ?? null,
    commissionRatePercent: commissionRatePercent ?? 5,
    joinedAt: new Date(),
  });

  const row = await loadProfile(db, id);
  return c.json(
    {
      employee: {
        id: row!.users.id,
        email: row!.users.email,
        name: row!.users.name,
        phone: row!.employee_profiles.phone,
        commissionRatePercent: row!.employee_profiles.commissionRatePercent,
      },
    },
    201
  );
});

employeeAdminRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')!;
  const db = getDb(c.env.DB);
  const row = await loadProfile(db, id);
  if (!row || row.users.role !== 'sales_employee') return c.json({ error: 'Employee not found' }, 404);

  const entries = await db.select().from(salesEntries).where(eq(salesEntries.userId, id)).orderBy(desc(salesEntries.date));
  const commission = await commissionSummary(db, id, row.employee_profiles.commissionRatePercent);

  return c.json({
    employee: {
      id: row.users.id,
      email: row.users.email,
      name: row.users.name,
      active: row.users.active,
      phone: row.employee_profiles.phone,
      contactAddress: row.employee_profiles.contactAddress,
      joinedAt: row.employee_profiles.joinedAt,
    },
    commission,
    entries,
  });
});

const updateEmployeeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  contactAddress: z.string().trim().optional(),
  commissionRatePercent: z.number().positive().optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

employeeAdminRoutes.patch('/:id', async (c) => {
  const parsed = updateEmployeeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const id = c.req.param('id')!;
  const db = getDb(c.env.DB);

  const [existing] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'sales_employee'))).limit(1);
  if (!existing) return c.json({ error: 'Employee not found' }, 404);

  const { name, active, password, phone, contactAddress, commissionRatePercent } = parsed.data;
  const userUpdate: Partial<typeof users.$inferInsert> = {};
  if (name) userUpdate.name = name;
  if (active !== undefined) userUpdate.active = active;
  if (password) userUpdate.passwordHash = await hashPassword(password);
  if (Object.keys(userUpdate).length > 0) await db.update(users).set(userUpdate).where(eq(users.id, id));

  const profileUpdate: Partial<typeof employeeProfiles.$inferInsert> = {};
  if (phone !== undefined) profileUpdate.phone = phone;
  if (contactAddress !== undefined) profileUpdate.contactAddress = contactAddress;
  if (commissionRatePercent !== undefined) profileUpdate.commissionRatePercent = commissionRatePercent;
  if (Object.keys(profileUpdate).length > 0) {
    await db.update(employeeProfiles).set(profileUpdate).where(eq(employeeProfiles.userId, id));
  }

  const row = await loadProfile(db, id);
  return c.json({
    employee: {
      id: row!.users.id,
      email: row!.users.email,
      name: row!.users.name,
      active: row!.users.active,
      phone: row!.employee_profiles.phone,
      contactAddress: row!.employee_profiles.contactAddress,
      commissionRatePercent: row!.employee_profiles.commissionRatePercent,
    },
  });
});
