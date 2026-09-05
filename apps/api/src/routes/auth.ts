import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { users } from '../db/schema';
import { signAccessToken, signRefreshToken } from '../lib/jwt';
import { sendOtpSms } from '../lib/msg91';
import { verifyPassword } from '../lib/password';
import type { Env } from '../env';

export const authRoutes = new Hono<{ Bindings: Env }>();

const OTP_TTL_SECONDS = 300;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const otpRequestSchema = z.object({ phone: z.string().trim().min(6).max(15) });
const otpVerifySchema = z.object({ phone: z.string().trim(), code: z.string().trim().length(6) });
// .trim() on password too — a prior bug (see git history) had a mobile
// keyboard's auto-inserted trailing space break otherwise-correct login.
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().trim() });

// Dev-mode note: MSG91 isn't configured yet (no real account). Rather than
// fail OTP login entirely, the code is returned directly in this response
// when env.MSG91_AUTH_KEY is unset, so the full login flow works
// end-to-end for testing. Set the MSG91_* secrets and this starts actually
// sending SMS instead — no other code change needed.
authRoutes.post('/otp/request', async (c) => {
  const parsed = otpRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid phone number' }, 400);
  const { phone } = parsed.data;

  const code = generateOtp();
  await c.env.CACHE.put(`otp:${phone}`, code, { expirationTtl: OTP_TTL_SECONDS });

  const devMode = !c.env.MSG91_AUTH_KEY;
  if (devMode) {
    return c.json({
      sent: true,
      devOtp: code,
      note: 'MSG91 not configured — dev mode: code returned directly instead of sent via SMS.',
    });
  }

  await sendOtpSms(c.env, phone, code);
  return c.json({ sent: true });
});

authRoutes.post('/otp/verify', async (c) => {
  const parsed = otpVerifySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const { phone, code } = parsed.data;

  const stored = await c.env.CACHE.get(`otp:${phone}`);
  if (!stored || stored !== code) return c.json({ error: 'Invalid or expired code' }, 401);
  await c.env.CACHE.delete(`otp:${phone}`);

  const db = getDb(c.env.DB);
  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user) {
    const id = crypto.randomUUID();
    await db.insert(users).values({ id, role: 'customer', phone });
    [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  }

  const claims = { sub: user.id, role: user.role, storeId: user.storeId };
  const accessToken = await signAccessToken(c.env, claims);
  const refreshToken = await signRefreshToken(c.env, claims);
  return c.json({
    accessToken,
    refreshToken,
    user: { id: user.id, role: user.role, phone: user.phone, name: user.name },
  });
});

// Email+password login for store_staff / delivery_partner / admin — never
// for customers (they're phone-OTP only; a customer row has no
// passwordHash to check against anyway).
authRoutes.post('/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid request' }, 400);
  const { email, password } = parsed.data;

  const db = getDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.passwordHash || user.role === 'customer' || !user.active) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

  const claims = { sub: user.id, role: user.role, storeId: user.storeId };
  const accessToken = await signAccessToken(c.env, claims);
  const refreshToken = await signRefreshToken(c.env, claims);
  return c.json({
    accessToken,
    refreshToken,
    user: { id: user.id, role: user.role, email: user.email, name: user.name, storeId: user.storeId },
  });
});
