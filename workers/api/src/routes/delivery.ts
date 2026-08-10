import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { getDb } from '../db/client';
import { deliveryPincodes } from '../db/schema';
import type { Env } from '../env';

export const deliveryRoutes = new Hono<{ Bindings: Env }>();

deliveryRoutes.get('/check', async (c) => {
  const pincode = c.req.query('pincode');
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return c.json({ error: 'Provide a valid 6-digit pincode' }, 400);
  }

  const db = getDb(c.env.DB);
  const [row] = await db
    .select()
    .from(deliveryPincodes)
    .where(eq(deliveryPincodes.pincode, pincode))
    .limit(1);

  if (!row || !row.serviceable) {
    return c.json({ pincode, serviceable: false, etaMinutes: null });
  }
  return c.json({ pincode, serviceable: true, etaMinutes: row.etaMinutes });
});
