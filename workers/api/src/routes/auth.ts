import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { getDb } from '../db/client';
import { users } from '../db/schema';
import type { Env } from '../env';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt';
import { isMsg91Configured, sendOtpSms } from '../lib/msg91';
import { generateOtp, hashOtp } from '../lib/otp';

const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

const requestOtpSchema = z.object({ phone: phoneSchema });
const verifyOtpSchema = z.object({ phone: phoneSchema, code: z.string().length(6) });
const refreshSchema = z.object({ refreshToken: z.string() });

const OTP_TTL_SECONDS = 5 * 60;
const OTP_RATE_LIMIT_SECONDS = 60;

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post('/otp/request', async (c) => {
  const parsed = requestOtpSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
  }
  const { phone } = parsed.data;

  const rateLimitKey = `otp:rate:${phone}`;
  if (await c.env.CACHE.get(rateLimitKey)) {
    return c.json({ error: 'Please wait before requesting another OTP' }, 429);
  }

  const otp = generateOtp();
  await c.env.CACHE.put(`otp:${phone}`, await hashOtp(otp, phone), {
    expirationTtl: OTP_TTL_SECONDS,
  });
  await c.env.CACHE.put(rateLimitKey, '1', { expirationTtl: OTP_RATE_LIMIT_SECONDS });

  if (isMsg91Configured(c.env)) {
    await sendOtpSms(c.env, phone, otp);
    return c.json({ success: true });
  }

  // Dev mode (no MSG91 credentials configured): echo the OTP back instead of
  // sending a real SMS, so login is fully testable without a live provider.
  return c.json({ success: true, devOtp: otp });
});

authRoutes.post('/otp/verify', async (c) => {
  const parsed = verifyOtpSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
  }
  const { phone, code } = parsed.data;

  const storedHash = await c.env.CACHE.get(`otp:${phone}`);
  if (!storedHash) {
    return c.json({ error: 'OTP expired or was never requested' }, 400);
  }
  if ((await hashOtp(code, phone)) !== storedHash) {
    return c.json({ error: 'Incorrect OTP' }, 400);
  }
  await c.env.CACHE.delete(`otp:${phone}`);

  const db = getDb(c.env.DB);
  const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  const user = existing[0] ?? { id: crypto.randomUUID(), phone, name: null, createdAt: new Date() };
  if (!existing[0]) {
    await db.insert(users).values(user);
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(c.env, user.id),
    signRefreshToken(c.env, user.id),
  ]);

  return c.json({
    accessToken,
    refreshToken,
    user: { id: user.id, phone: user.phone, name: user.name },
  });
});

authRoutes.post('/refresh', async (c) => {
  const parsed = refreshSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  try {
    const userId = await verifyToken(c.env, parsed.data.refreshToken, 'refresh');
    return c.json({ accessToken: await signAccessToken(c.env, userId) });
  } catch {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }
});
