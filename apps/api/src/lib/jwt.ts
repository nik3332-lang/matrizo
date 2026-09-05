import { SignJWT, jwtVerify } from 'jose';

import type { UserRole } from '@matrizo/shared';
import type { Env } from '../env';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const DEV_FALLBACK_SECRET = 'dev-insecure-secret-change-me';

let warnedAboutDevSecret = false;

function getSecretKey(env: Env) {
  if (!env.JWT_SECRET && !warnedAboutDevSecret) {
    console.warn(
      'JWT_SECRET is not set — using an insecure development fallback. Set it with `wrangler secret put JWT_SECRET` before going live.'
    );
    warnedAboutDevSecret = true;
  }
  return new TextEncoder().encode(env.JWT_SECRET ?? DEV_FALLBACK_SECRET);
}

type TokenType = 'access' | 'refresh';

export type AuthClaims = {
  sub: string;
  role: UserRole;
  storeId: string | null;
};

async function signToken(env: Env, claims: AuthClaims, type: TokenType, ttl: string): Promise<string> {
  return new SignJWT({ type, role: claims.role, storeId: claims.storeId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getSecretKey(env));
}

export async function signAccessToken(env: Env, claims: AuthClaims): Promise<string> {
  return signToken(env, claims, 'access', ACCESS_TOKEN_TTL);
}

export async function signRefreshToken(env: Env, claims: AuthClaims): Promise<string> {
  return signToken(env, claims, 'refresh', REFRESH_TOKEN_TTL);
}

export async function verifyToken(env: Env, token: string, expectedType: TokenType): Promise<AuthClaims> {
  const { payload } = await jwtVerify(token, getSecretKey(env));
  if (
    payload.type !== expectedType ||
    typeof payload.sub !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    throw new Error('Invalid token');
  }
  return {
    sub: payload.sub,
    role: payload.role as UserRole,
    storeId: typeof payload.storeId === 'string' ? payload.storeId : null,
  };
}
