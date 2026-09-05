import { Hono } from 'hono';

import { getDb } from '../db/client';
import { findServiceableStore } from '../lib/serviceability';
import type { Env } from '../env';

export const serviceabilityRoutes = new Hono<{ Bindings: Env }>();

serviceabilityRoutes.get('/:pincode', async (c) => {
  const pincode = c.req.param('pincode');
  const db = getDb(c.env.DB);
  const match = await findServiceableStore(db, pincode);

  return c.json({
    pincode,
    serviceable: match !== null,
    storeId: match?.storeId ?? null,
    etaMinutes: match?.etaMinutes ?? null,
  });
});
