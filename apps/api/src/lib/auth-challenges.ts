import type { Env } from "../env";
import { sendOtpSms } from "./msg91";
import { sendResetEmail } from "./resend";

export type ChallengePurpose =
  | "password_reset"
  | "password_reset_email"
  | "customer_login";
export const CODE_TTL = 300;
export const RESEND_AFTER = 60;

async function digest(env: Env, value: string): Promise<string> {
  if (!env.JWT_SECRET) throw new Error("JWT_SECRET must be configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hash = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function generateCode(): string {
  const values = new Uint32Array(1);
  // Rejection sampling avoids modulo bias.
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= 4_294_000_000);
  return String(values[0] % 1_000_000).padStart(6, "0");
}

// D1's atomic upsert enforces quotas even for simultaneous requests at different edges.
export async function allowAuthAttempt(
  env: Env,
  key: string,
  limit: number,
  seconds: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const hashedKey = await digest(env, `rate:${key}`);
  const row = await env.DB.prepare(
    `
    INSERT INTO auth_rate_limits (key,count,expires_at) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    RETURNING count
  `,
  )
    .bind(hashedKey, now + seconds, now, now)
    .first<{ count: number }>();
  return Boolean(row && row.count <= limit);
}

export async function issueChallenge(
  env: Env,
  destination: string,
  purpose: ChallengePurpose,
  user: { id: string; sessionVersion: number } | null,
) {
  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();
  const code = generateCode();
  const codeHash = await digest(env, `${purpose}:${id}:${code}`);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_challenges WHERE expires_at <= ?").bind(
      now,
    ),
    env.DB.prepare("DELETE FROM auth_rate_limits WHERE expires_at <= ?").bind(
      now,
    ),
    env.DB.prepare(
      `INSERT INTO auth_challenges
      (id,destination,purpose,user_id,session_version,code_hash,expires_at)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT(destination,purpose) DO UPDATE SET
      id=excluded.id,user_id=excluded.user_id,session_version=excluded.session_version,
      code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,consumed_at=NULL,redemption_id=NULL
    `,
    ).bind(
      id,
      destination,
      purpose,
      user?.id ?? null,
      user?.sessionVersion ?? 0,
      codeHash,
      now + CODE_TTL,
    ),
  ]);
  // Delivery runs after the generic response, so provider timing/errors cannot
  // reveal whether a phone belongs to a customer. Failure invalidates its code.
  const deliver = async () => {
    if (!user) return;
    try {
      if (purpose === "password_reset_email")
        await sendResetEmail(env, destination, code, id);
      else await sendOtpSms(env, destination, code);
    } catch {
      await env.DB.prepare(
        "UPDATE auth_challenges SET consumed_at=? WHERE id=?",
      )
        .bind(now, id)
        .run();
      console.error("Authentication message delivery failed");
    }
  };
  return { id, deliver };
}

export async function redeemChallenge(
  env: Env,
  id: string,
  code: string,
  purpose: ChallengePurpose,
  passwordHash?: string,
) {
  const now = Math.floor(Date.now() / 1000);
  const hash = await digest(env, `${purpose}:${id}:${code}`);
  const redemption = crypto.randomUUID();
  // Every eligible guess spends an attempt. The correct code is consumed by an
  // atomic update, so concurrent submissions cannot redeem the same code twice.
  const claim = env.DB.prepare(
    `UPDATE auth_challenges SET attempts=attempts+1,
    consumed_at=CASE WHEN code_hash=? THEN ? ELSE NULL END,
    redemption_id=CASE WHEN code_hash=? THEN ? ELSE NULL END
    WHERE id=? AND purpose=? AND expires_at>? AND consumed_at IS NULL AND attempts<5
    RETURNING user_id,session_version,redemption_id
  `,
  ).bind(hash, now, hash, redemption, id, purpose, now);
  if (purpose === "password_reset" || purpose === "password_reset_email") {
    if (!passwordHash) throw new Error("Password hash required");
    // D1 batch is transactional: consume proof and change the password together.
    const results = await env.DB.batch([
      claim,
      env.DB.prepare(
        `UPDATE users SET password_hash=?,session_version=session_version+1
        WHERE active=1 AND role='customer' AND EXISTS (
          SELECT 1 FROM auth_challenges c WHERE c.id=? AND c.redemption_id=?
          AND c.user_id=users.id AND c.session_version=users.session_version
        ) RETURNING id
      `,
      ).bind(passwordHash, id, redemption),
    ]);
    const user = results[1].results[0] as { id: string } | undefined;
    return user ? { userId: user.id } : null;
  }
  const result = await claim.first<{
    user_id: string | null;
    session_version: number;
    redemption_id: string | null;
  }>();
  if (!result?.user_id || result.redemption_id !== redemption) return null;
  return { userId: result.user_id, sessionVersion: result.session_version };
}
