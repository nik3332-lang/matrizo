import { eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getDb } from "../db/client";
import { users } from "../db/schema";
import { signAccessToken, signRefreshToken, verifyToken } from "../lib/jwt";
import { sendOtpSms } from "../lib/msg91";
import { hashPassword, verifyPassword } from "../lib/password";
import type { Env } from "../env";

export const authRoutes = new Hono<{ Bindings: Env }>();

const OTP_TTL_SECONDS = 300;

function generateOtp(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (100000 + (values[0] % 900000)).toString();
}

const otpRequestSchema = z.object({ phone: z.string().trim().min(6).max(15) });
const otpVerifySchema = z.object({
  phone: z.string().trim(),
  code: z.string().trim().length(6),
});
// .trim() on password too — a prior bug (see git history) had a mobile
// keyboard's auto-inserted trailing space break otherwise-correct login.
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().trim(),
});

// SMS must be configured before OTP sign-in can be used. Never expose codes.
authRoutes.post("/otp/request", async (c) => {
  if (!c.env.MSG91_AUTH_KEY)
    return c.json(
      {
        error:
          "SMS sign-in is not available yet. Please sign in with your email.",
      },
      503,
    );
  const parsed = otpRequestSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return c.json({ error: "Invalid phone number" }, 400);
  const { phone } = parsed.data;

  const code = generateOtp();
  await c.env.CACHE.put(`otp:${phone}`, code, {
    expirationTtl: OTP_TTL_SECONDS,
  });

  await sendOtpSms(c.env, phone, code);
  return c.json({ sent: true });
});

authRoutes.post("/otp/verify", async (c) => {
  if (!c.env.MSG91_AUTH_KEY)
    return c.json({ error: "SMS sign-in is not available yet." }, 503);
  const parsed = otpVerifySchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { phone, code } = parsed.data;

  const stored = await c.env.CACHE.get(`otp:${phone}`);
  if (!stored || stored !== code)
    return c.json({ error: "Invalid or expired code" }, 401);
  await c.env.CACHE.delete(`otp:${phone}`);

  const db = getDb(c.env.DB);
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  if (!user) {
    const id = crypto.randomUUID();
    await db.insert(users).values({ id, role: "customer", phone });
    [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  }
  if (!user.active || user.role !== "customer")
    return c.json({ error: "This account cannot use customer sign-in." }, 403);

  const claims = { sub: user.id, role: user.role, storeId: user.storeId };
  const accessToken = await signAccessToken(c.env, claims);
  const refreshToken = await signRefreshToken(c.env, claims);
  return c.json({
    accessToken,
    refreshToken,
    user: { id: user.id, role: user.role, phone: user.phone, name: user.name },
  });
});

// Staff and customers use separate sign-in endpoints and role checks.
authRoutes.post("/login", async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);
  const { email, password } = parsed.data;

  const db = getDb(c.env.DB);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user || !user.passwordHash || user.role === "customer" || !user.active) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const claims = { sub: user.id, role: user.role, storeId: user.storeId };
  const accessToken = await signAccessToken(c.env, claims);
  const refreshToken = await signRefreshToken(c.env, claims);
  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      storeId: user.storeId,
    },
  });
});

async function session(env: Env, user: typeof users.$inferSelect) {
  const claims = { sub: user.id, role: user.role, storeId: user.storeId };
  return {
    accessToken: await signAccessToken(env, claims),
    refreshToken: await signRefreshToken(env, claims),
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      storeId: user.storeId,
    },
  };
}

// A per-IP throttle also covers attempts against nonexistent emails.
authRoutes.use("/customer-*", async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "local";
  const key = `customer-auth:${ip}`;
  const attempts = Number((await c.env.CACHE.get(key)) ?? 0);
  if (attempts >= 30)
    return c.json(
      { error: "Too many attempts. Please try again in 15 minutes." },
      429,
    );
  await c.env.CACHE.put(key, String(attempts + 1), { expirationTtl: 900 });
  await next();
});
const customerRegistration = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  password: z.string().min(10).max(128),
});
authRoutes.post("/customer-register", async (c) => {
  const parsed = customerRegistration.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success)
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Check your details." },
      400,
    );
  const db = getDb(c.env.DB);
  const { email, name, phone, password } = parsed.data;
  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.phone, phone)))
    .limit(1);
  if (existing)
    return c.json(
      {
        error:
          "An account already uses this email or mobile number. Please sign in.",
      },
      409,
    );
  const id = crypto.randomUUID();
  try {
    await db
      .insert(users)
      .values({
        id,
        role: "customer",
        email,
        name,
        phone,
        passwordHash: await hashPassword(password),
      });
  } catch (error) {
    if (
      (String(error) + String((error as { cause?: unknown }).cause)).includes(
        "UNIQUE",
      )
    )
      return c.json(
        {
          error:
            "An account already uses this email or mobile number. Please sign in.",
        },
        409,
      );
    throw error;
  }
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return c.json(await session(c.env, user), 201);
});
authRoutes.post("/customer-login", async (c) => {
  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(1).max(128),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return c.json({ error: "Enter your email and password." }, 400);
  const [user] = await getDb(c.env.DB)
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (
    !user?.active ||
    user.role !== "customer" ||
    !user.passwordHash ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  )
    return c.json({ error: "Email or password is incorrect." }, 401);
  return c.json(await session(c.env, user));
});
authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>().catch(() => null);
  if (!body?.refreshToken) return c.json({ error: "Unauthorized" }, 401);
  let id: string;
  try {
    id = (await verifyToken(c.env, body.refreshToken, "refresh")).sub;
  } catch {
    return c.json({ error: "Session expired. Please sign in again." }, 401);
  }
  const [user] = await getDb(c.env.DB)
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user?.active) return c.json({ error: "Account is inactive." }, 401);
  return c.json(await session(c.env, user));
});
