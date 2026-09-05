export const API_VERSION = 'v1';

export * from './enums';
export * from './schemas';
export * from './pricing';

// Note: the previous MVP kept a generic typed fetch client here
// (createApiClient in client.ts). It's dropped in this rewrite rather than
// carried forward speculatively — the route shapes are changing significantly
// (role-based auth, store-scoped orders/inventory) and a client built against
// the old contract would be actively misleading. Re-add it once the routes in
// apps/api/src/routes stabilize.
