import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";

import type { UserRole } from "@matrizo/shared";
import { verifyToken, type AuthClaims } from "../lib/jwt";
import type { Env } from "../env";
import { getDb } from "../db/client";
import { users } from "../db/schema";

export type AuthEnv = { Bindings: Env; Variables: { auth: AuthClaims } };

export async function requireAuth(c: Context<AuthEnv>, next: Next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  let claims: AuthClaims;
  try {
    claims = await verifyToken(c.env, token, "access");
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const [user] = await getDb(c.env.DB)
    .select()
    .from(users)
    .where(eq(users.id, claims.sub))
    .limit(1);
  if (!user?.active)
    return c.json(
      { error: "Your account is inactive. Please contact your administrator." },
      401,
    );
  c.set("auth", { sub: user.id, role: user.role, storeId: user.storeId });
  await next();
}

// Chain after requireAuth: `v1.get('/x', requireAuth, requireRole('admin'), handler)`.
export function requireRole(...roles: UserRole[]) {
  return async (c: Context<AuthEnv>, next: Next) => {
    const auth = c.get("auth");
    if (!auth || !roles.includes(auth.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
