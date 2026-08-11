import { SignJWT, jwtVerify } from 'jose';

import type { Env } from '../env';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const OWNER_TOKEN_TTL = '12h';
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

type TokenType = 'access' | 'refresh' | 'owner';

export async function signAccessToken(env: Env, userId: string): Promise<string> {
  return new SignJWT({ type: 'access' satisfies TokenType })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecretKey(env));
}

export async function signRefreshToken(env: Env, userId: string): Promise<string> {
  return new SignJWT({ type: 'refresh' satisfies TokenType })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecretKey(env));
}

// The owner dashboard has no user record — subject is always the fixed
// literal "owner" rather than a userId.
export async function signOwnerToken(env: Env): Promise<string> {
  return new SignJWT({ type: 'owner' satisfies TokenType })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('owner')
    .setIssuedAt()
    .setExpirationTime(OWNER_TOKEN_TTL)
    .sign(getSecretKey(env));
}

export async function verifyToken(env: Env, token: string, expectedType: TokenType): Promise<string> {
  const { payload } = await jwtVerify(token, getSecretKey(env));
  if (payload.type !== expectedType || typeof payload.sub !== 'string') {
    throw new Error('Invalid token');
  }
  return payload.sub;
}
