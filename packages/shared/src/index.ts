// Shared types, zod schemas, and API client used by both the Expo app
// (apps/app) and the Cloudflare Worker API (workers/api). Kept intentionally
// empty in Phase 0 — the first real additions (health-check response type,
// then catalog/auth/cart schemas) land alongside the corresponding backend
// phases so the client and server never drift out of sync.
export const API_VERSION = 'v1';
