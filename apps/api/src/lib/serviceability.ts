import { and, asc, eq } from 'drizzle-orm';

import type { getDb } from '../db/client';
import { storeServicePincodes, stores } from '../db/schema';

// Resolves a pincode to the store that should fulfil an order there: the
// fastest (lowest ETA) of the possibly-several active stores serving it.
// Shared by the serviceability-check route and, later, order creation
// ("assign to nearest store with stock" — that step also needs to check
// inventory, which this deliberately doesn't; it only answers "is this
// pincode covered at all, and by which store").
export async function findServiceableStore(db: ReturnType<typeof getDb>, pincode: string) {
  const [match] = await db
    .select({
      storeId: stores.id,
      etaMinutes: storeServicePincodes.etaMinutes,
    })
    .from(storeServicePincodes)
    .innerJoin(stores, eq(stores.id, storeServicePincodes.storeId))
    .where(and(eq(storeServicePincodes.pincode, pincode), eq(stores.active, true)))
    .orderBy(asc(storeServicePincodes.etaMinutes))
    .limit(1);

  return match ?? null;
}
