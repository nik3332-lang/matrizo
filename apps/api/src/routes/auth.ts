import { eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getDb } from "../db/client";
import { users } from "../db/schema";
import { signAccessToken, signRefreshToken, verifyToken } from "../lib/jwt";
import { smsConfigured } from "../lib/msg91";
import { emailConfigured } from "../lib/resend";
import { normalizePhone, phoneAliases } from "../lib/phone";
import {
  allowAuthAttempt,
  issueChallenge,
  redeemChallenge,
  CODE_TTL,
  RESEND_AFTER,
  type ChallengePurpose,
} from "../lib/auth-challenges";
import { hashPassword, verifyPassword } from "../lib/password";
import type { Env } from "../env";

export const authRoutes = new Hono<{ Bindings: Env }>();

const phoneSchema = z
  .string()
  .trim()
  .max(32)
  .transform(normalizePhone)
  .refine(
    (phone): phone is string => phone !== null,
    "Enter a valid Indian mobile number.",
  );
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().trim().max(128),
});
const proofSchema = z.object({
  challengeId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the six-digit code."),
});

async function userByPhone(env: Env, phone: string) {
  const matches = await getDb(env.DB)
    .select()
    .from(users)
    .where(inArray(users.phone, phoneAliases(phone)))
    .limit(2);
  // Never pick an arbitrary account if historical number formats collide.
  return matches.length === 1 ? matches[0] : undefined;
}

authRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (c.req.method === "POST") {
    const ip = c.req.header("CF-Connecting-IP") ?? "local";
    if (!(await allowAuthAttempt(c.env, `auth-ip:${ip}`, 60, 900)))
      return c.json(
        { error: "Too many attempts. Please try again in 15 minutes." },
        429,
      );
  }
  await next();
});

authRoutes.get("/options", (c) =>
  c.json({
    passwordReset: emailConfigured(c.env),
    smsPasswordReset: smsConfigured(c.env),
  }),
);

for (const [path, purpose] of [
  ["/password-reset/request", "password_reset"],
  ["/password-reset/email/request", "password_reset_email"],
  ["/otp/request", "customer_login"],
] as const) {
  authRoutes.post(path, async (c) => {
    const emailRecovery = purpose === "password_reset_email";
    if (emailRecovery ? !emailConfigured(c.env) : !smsConfigured(c.env))
      return c.json(
        {
          error:
            "Recovery messages are temporarily unavailable. Please try again later.",
        },
        503,
      );
    const body = await c.req.json().catch(() => null);
    const parsed = emailRecovery
      ? z
          .object({ email: z.string().trim().toLowerCase().email().max(254) })
          .transform(({ email }) => email)
          .safeParse(body)
      : z
          .object({ phone: phoneSchema })
          .transform(({ phone }) => phone)
          .safeParse(body);
    if (!parsed.success)
      return c.json(
        {
          error: emailRecovery
            ? "Enter your registered email address."
            : "Enter a valid Indian mobile number.",
        },
        400,
      );
    const destination = parsed.data;
    const ip = c.req.header("CF-Connecting-IP") ?? "local";
    for (const [key, limit, seconds] of [
      [`recovery-ip:${ip}`, 10, 900],
      [`recovery-destination:${destination}`, 3, 900],
      [`recovery-cooldown:${destination}`, 1, RESEND_AFTER],
    ] as const) {
      if (!(await allowAuthAttempt(c.env, key, limit, seconds))) {
        c.header("Retry-After", String(seconds));
        return c.json(
          {
            error:
              "Please wait before requesting another code. You can request up to 3 codes in 15 minutes.",
          },
          429,
        );
      }
    }
    const user = emailRecovery
      ? (
          await getDb(c.env.DB)
            .select()
            .from(users)
            .where(eq(users.email, destination))
            .limit(1)
        )[0]
      : await userByPhone(c.env, destination);
    const challenge = await issueChallenge(
      c.env,
      destination,
      purpose,
      user?.active && user.role === "customer" ? user : null,
    );
    c.executionCtx.waitUntil(challenge.deliver());
    return c.json({
      accepted: true,
      challengeId: challenge.id,
      expiresIn: CODE_TTL,
      resendAfter: RESEND_AFTER,
      message: emailRecovery
        ? "If an active customer account uses this email, a code will arrive shortly. Check your inbox and spam folder."
        : "If an active customer account uses this number, a code will arrive shortly.",
    });
  });
}

for (const [path, purpose] of [
  ["/password-reset/confirm", "password_reset"],
  ["/password-reset/email/confirm", "password_reset_email"],
  ["/otp/verify", "customer_login"],
] as const satisfies readonly (readonly [string, ChallengePurpose])[]) {
  authRoutes.post(path, async (c) => {
    const emailRecovery = purpose === "password_reset_email";
    if (emailRecovery ? !emailConfigured(c.env) : !smsConfigured(c.env))
      return c.json(
        {
          error:
            "Recovery messages are temporarily unavailable. Please try again later.",
        },
        503,
      );
    const schema =
      purpose !== "customer_login"
        ? proofSchema.extend({ password: z.string().min(10).max(128) })
        : proofSchema;
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return c.json(
        {
          error:
            "Enter the six-digit code and a password of at least 10 characters.",
        },
        400,
      );
    const data = parsed.data;
    const redeemed = await redeemChallenge(
      c.env,
      data.challengeId,
      data.code,
      purpose,
      "password" in data
        ? await hashPassword(data.password as string)
        : undefined,
    );
    if (!redeemed)
      return c.json(
        { error: "Invalid or expired code. Please request a new code." },
        401,
      );
    if (purpose !== "customer_login") return c.json({ reset: true });
    const [user] = await getDb(c.env.DB)
      .select()
      .from(users)
      .where(eq(users.id, redeemed.userId))
      .limit(1);
    if (
      !user?.active ||
      user.role !== "customer" ||
      user.sessionVersion !== redeemed.sessionVersion
    )
      return c.json(
        { error: "Invalid or expired code. Please request a new code." },
        401,
      );
    return c.json(await session(c.env, user));
  });
}

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

  const claims = {
    sub: user.id,
    role: user.role,
    storeId: user.storeId,
    sessionVersion: user.sessionVersion,
  };
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
  const claims = {
    sub: user.id,
    role: user.role,
    storeId: user.storeId,
    sessionVersion: user.sessionVersion,
  };
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

const customerRegistration = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(2).max(100),
  phone: phoneSchema,
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
    .where(
      or(eq(users.email, email), inArray(users.phone, phoneAliases(phone))),
    )
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
    await db.insert(users).values({
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
      identifier: z.string().trim().min(1).max(254).optional(),
      email: z.string().trim().min(1).max(254).optional(),
      password: z.string().min(1).max(128),
    })
    .safeParse(await c.req.json().catch(() => null));
  const identifier = parsed.success
    ? (parsed.data.identifier ?? parsed.data.email)?.toLowerCase()
    : null;
  if (!parsed.success || !identifier)
    return c.json(
      { error: "Enter your email or mobile number and password." },
      400,
    );
  const phone = normalizePhone(identifier);
  const email = z.email().safeParse(identifier);
  if (!phone && !email.success)
    return c.json(
      { error: "Enter a valid email or Indian mobile number." },
      400,
    );
  if (
    !(await allowAuthAttempt(c.env, `password:${phone ?? identifier}`, 15, 900))
  )
    return c.json(
      { error: "Too many attempts. Please try again in 15 minutes." },
      429,
    );
  const user = phone
    ? await userByPhone(c.env, phone)
    : (
        await getDb(c.env.DB)
          .select()
          .from(users)
          .where(eq(users.email, identifier))
          .limit(1)
      )[0];
  if (
    !user?.active ||
    user.role !== "customer" ||
    !user.passwordHash ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  )
    return c.json(
      { error: "Mobile number, email or password is incorrect." },
      401,
    );
  return c.json(await session(c.env, user));
});
authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>().catch(() => null);
  if (!body?.refreshToken) return c.json({ error: "Unauthorized" }, 401);
  let claims: Awaited<ReturnType<typeof verifyToken>>;
  try {
    claims = await verifyToken(c.env, body.refreshToken, "refresh");
  } catch {
    return c.json({ error: "Session expired. Please sign in again." }, 401);
  }
  const [user] = await getDb(c.env.DB)
    .select()
    .from(users)
    .where(eq(users.id, claims.sub))
    .limit(1);
  if (!user?.active || user.sessionVersion !== (claims.sessionVersion ?? 0))
    return c.json({ error: "Session expired. Please sign in again." }, 401);
  return c.json(await session(c.env, user));
});
