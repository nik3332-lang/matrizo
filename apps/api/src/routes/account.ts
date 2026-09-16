import { and, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getDb } from "../db/client";
import { addresses, orders, users } from "../db/schema";
import { requireAuth, requireRole, type AuthEnv } from "../middleware/auth";
import { verifyPassword } from "../lib/password";
import { allowAuthAttempt } from "../lib/auth-challenges";
import { finalizeAccountDeletions } from "../lib/accountDeletion";
import { pushAvailable } from "../lib/pushNotifications";

export const accountRoutes = new Hono<AuthEnv>();

accountRoutes.use("*", requireAuth);

accountRoutes.post("/deletion", requireRole("customer"), async (c) => {
  const auth = c.get("auth");
  if (!(await allowAuthAttempt(c.env, `account-deletion:${auth.sub}`, 5, 900)))
    return c.json(
      { error: "Too many attempts. Please try again in 15 minutes." },
      429,
    );
  const parsed = z
    .object({
      password: z.string().min(1).max(128),
      confirmation: z.literal("DELETE"),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json(
      { error: "Enter your password and type DELETE to confirm." },
      400,
    );
  const [user] = await getDb(c.env.DB)
    .select()
    .from(users)
    .where(eq(users.id, auth.sub))
    .limit(1);
  if (
    !user?.passwordHash ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  )
    return c.json({ error: "Your password is incorrect." }, 403);
  const now = Math.floor(Date.now() / 1000);
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE users SET active=0,session_version=session_version+1,deletion_requested_at=?
      WHERE id=? AND active=1 AND role='customer' AND session_version=? RETURNING id`,
    ).bind(now, auth.sub, auth.sessionVersion ?? 0),
    c.env.DB.prepare(
      "DELETE FROM push_devices WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND deletion_requested_at IS NOT NULL)",
    ).bind(auth.sub, auth.sub),
    c.env.DB.prepare(
      "DELETE FROM cart_items WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND deletion_requested_at IS NOT NULL)",
    ).bind(auth.sub, auth.sub),
    c.env.DB.prepare(
      "DELETE FROM auth_challenges WHERE user_id=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND deletion_requested_at IS NOT NULL)",
    ).bind(auth.sub, auth.sub),
  ]);
  if (!results[0].results.length)
    return c.json({ error: "Session expired. Please sign in again." }, 401);
  await finalizeAccountDeletions(c.env);
  const state = await c.env.DB.prepare(
    "SELECT deleted_at FROM users WHERE id=?",
  )
    .bind(auth.sub)
    .first<{ deleted_at: number | null }>();
  return c.json({
    status: state?.deleted_at ? "deleted" : "pending_delivery",
    message: state?.deleted_at
      ? "Your account and personal details have been deleted."
      : "Your account is closed. Details needed for your open orders will be removed automatically after delivery or cancellation.",
  });
});

const deviceSchema = z.object({
  token: z
    .string()
    .regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/),
  platform: z.enum(["android", "ios"]),
});
accountRoutes.get("/notifications", requireRole("customer"), (c) =>
  c.json({ available: pushAvailable(c.env) }),
);
accountRoutes.post(
  "/notifications/device",
  requireRole("customer"),
  async (c) => {
    if (!pushAvailable(c.env))
      return c.json(
        { error: "Order notifications are not available yet." },
        503,
      );
    const auth = c.get("auth");
    const parsed = deviceSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return c.json({ error: "Invalid notification device." }, 400);
    if (!(await allowAuthAttempt(c.env, `push-register:${auth.sub}`, 30, 900)))
      return c.json(
        { error: "Please wait before changing notification settings again." },
        429,
      );
    const now = Math.floor(Date.now() / 1000);
    const result = await c.env.DB.prepare(
      `INSERT INTO push_devices (token,user_id,session_version,platform,created_at,updated_at)
    SELECT ?,id,session_version,?,?,? FROM users WHERE id=? AND active=1 AND session_version=?
    AND ((SELECT count(*) FROM push_devices WHERE user_id=?)<10 OR EXISTS(SELECT 1 FROM push_devices WHERE token=? AND user_id=?))
    ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,session_version=excluded.session_version,platform=excluded.platform,
      created_at=CASE WHEN push_devices.user_id=excluded.user_id THEN push_devices.created_at ELSE excluded.created_at END,updated_at=excluded.updated_at
    RETURNING token`,
    )
      .bind(
        parsed.data.token,
        parsed.data.platform,
        now,
        now,
        auth.sub,
        auth.sessionVersion ?? 0,
        auth.sub,
        parsed.data.token,
        auth.sub,
      )
      .all();
    if (!result.results.length)
      return c.json(
        {
          error:
            "The device limit was reached or your session expired. Sign in again to continue.",
        },
        409,
      );
    return c.json({ registered: true });
  },
);
accountRoutes.post(
  "/notifications/unregister",
  requireRole("customer"),
  async (c) => {
    const parsed = deviceSchema
      .pick({ token: true })
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return c.json({ error: "Invalid notification device." }, 400);
    await c.env.DB.prepare(
      "DELETE FROM push_devices WHERE token=? AND user_id=?",
    )
      .bind(parsed.data.token, c.get("auth").sub)
      .run();
    return c.json({ removed: true });
  },
);

accountRoutes.get("/me", async (c) => {
  const auth = c.get("auth");
  const db = getDb(c.env.DB);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.sub))
    .limit(1);
  if (!user) return c.json({ error: "Not found" }, 404);

  return c.json({
    user: {
      id: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
      name: user.name,
      storeId: user.storeId,
    },
  });
});

const updateMeSchema = z.object({ name: z.string().trim().min(1).max(100) });

accountRoutes.patch("/me", async (c) => {
  const parsed = updateMeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const auth = c.get("auth");
  const db = getDb(c.env.DB);

  await db
    .update(users)
    .set({ name: parsed.data.name })
    .where(
      and(
        eq(users.id, auth.sub),
        eq(users.active, true),
        isNull(users.deletionRequestedAt),
        eq(users.sessionVersion, auth.sessionVersion ?? 0),
      ),
    );
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.sub))
    .limit(1);
  return c.json({
    user: {
      id: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
      name: user.name,
      storeId: user.storeId,
    },
  });
});

const addressSchema = z.object({
  label: z.string().trim().max(50).optional(),
  line1: z.string().trim().min(1).max(250),
  line2: z.string().trim().max(250).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode."),
  isDefault: z.boolean().optional(),
});

accountRoutes.get("/addresses", requireRole("customer"), async (c) => {
  const auth = c.get("auth");
  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, auth.sub));
  return c.json({ addresses: rows });
});

accountRoutes.post("/addresses", requireRole("customer"), async (c) => {
  const parsed = addressSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const auth = c.get("auth");
  const db = getDb(c.env.DB);

  const id = crypto.randomUUID();
  const data = parsed.data;
  const inserted = await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE addresses SET is_default=0 WHERE user_id=? AND ?=1
      AND EXISTS(SELECT 1 FROM users WHERE id=? AND active=1 AND deletion_requested_at IS NULL AND session_version=?)`,
    ).bind(
      auth.sub,
      data.isDefault ? 1 : 0,
      auth.sub,
      auth.sessionVersion ?? 0,
    ),
    c.env.DB.prepare(
      `INSERT INTO addresses (id,user_id,label,line1,line2,city,state,pincode,is_default)
      SELECT ?,id,?,?,?,?,?,?,? FROM users WHERE id=? AND active=1 AND deletion_requested_at IS NULL AND session_version=? RETURNING id`,
    ).bind(
      id,
      data.label ?? null,
      data.line1,
      data.line2 ?? null,
      data.city,
      data.state,
      data.pincode,
      data.isDefault ? 1 : 0,
      auth.sub,
      auth.sessionVersion ?? 0,
    ),
  ]);
  if (!inserted[1].results.length)
    return c.json({ error: "Session expired. Please sign in again." }, 401);

  const [address] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.id, id))
    .limit(1);
  return c.json({ address }, 201);
});

accountRoutes.patch("/addresses/:id", requireRole("customer"), async (c) => {
  const parsed = addressSchema
    .partial()
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const auth = c.get("auth");
  const db = getDb(c.env.DB);
  const id = c.req.param("id")!;

  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, auth.sub)))
    .limit(1);
  if (!existing) return c.json({ error: "Address not found" }, 404);

  // Addresses attached to orders are delivery records; use a new address for changes.
  if (Object.keys(parsed.data).some((key) => key !== "isDefault")) {
    const used = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.addressId, id))
      .limit(1);
    if (used.length)
      return c.json(
        {
          error:
            "This address is attached to an order. Add a new address to change delivery details.",
        },
        409,
      );
  }
  if (!Object.keys(parsed.data).length)
    return c.json({ error: "No changes supplied" }, 400);
  const active = sql`EXISTS (SELECT 1 FROM users WHERE id=${auth.sub} AND active=1 AND deletion_requested_at IS NULL AND session_version=${auth.sessionVersion ?? 0})`;
  const updated = await db.batch([
    db
      .update(addresses)
      .set({ isDefault: false })
      .where(
        and(
          eq(addresses.userId, auth.sub),
          sql`${parsed.data.isDefault ? 1 : 0}=1`,
          active,
        ),
      ),
    db
      .update(addresses)
      .set(parsed.data)
      .where(
        and(
          eq(addresses.id, id),
          eq(addresses.userId, auth.sub),
          active,
          // Also check order attachment within the transaction to close the checkout race.
          Object.keys(parsed.data).some((key) => key !== "isDefault")
            ? sql`NOT EXISTS(SELECT 1 FROM orders WHERE address_id=${id})`
            : sql`1=1`,
        ),
      )
      .returning({ id: addresses.id }),
  ]);
  if (!updated[1].length)
    return c.json(
      {
        error:
          "This address changed or is now attached to an order. Refresh and try again.",
      },
      409,
    );

  const [address] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.id, id))
    .limit(1);
  return c.json({ address });
});

accountRoutes.delete("/addresses/:id", requireRole("customer"), async (c) => {
  const auth = c.get("auth");
  const db = getDb(c.env.DB);
  const id = c.req.param("id")!;

  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, auth.sub)))
    .limit(1);
  if (!existing) return c.json({ error: "Address not found" }, 404);

  // orders.addressId references this row with no ON DELETE behavior — same
  // FK-enforcement issue as products (see routes/catalog.ts). An address
  // that's been used on a past order can't be hard-deleted; there's no
  // "active" flag on addresses to fall back to like products have, so the
  // honest answer here is refuse, not silently no-op.
  const [orderUsingAddress] = await db
    .select()
    .from(orders)
    .where(eq(orders.addressId, id))
    .limit(1);
  if (orderUsingAddress) {
    return c.json(
      { error: "Can't delete an address used on a past order." },
      409,
    );
  }

  await db.delete(addresses).where(eq(addresses.id, id));
  return c.json({ ok: true });
});
