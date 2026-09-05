import { and, asc, eq, inArray } from 'drizzle-orm';

import type { getDb } from '../db/client';
import { inventory, storeServicePincodes, stores } from '../db/schema';

export type CartLine = { productId: string; quantity: number };

// Picks the store to fulfil an order: among active stores serving the given
// pincode (fastest ETA first, same ordering as findServiceableStore), the
// first one that has enough stock of *every* line item. Whole-cart, not
// split-shipment — simplest correct behavior for this MVP; a cart that no
// single store can fully cover returns null rather than partially fulfilling
// it from two stores.
export async function findStoreWithStock(
  db: ReturnType<typeof getDb>,
  pincode: string,
  items: CartLine[]
) {
  const candidates = await db
    .select({ storeId: stores.id, etaMinutes: storeServicePincodes.etaMinutes })
    .from(storeServicePincodes)
    .innerJoin(stores, eq(stores.id, storeServicePincodes.storeId))
    .where(and(eq(storeServicePincodes.pincode, pincode), eq(stores.active, true)))
    .orderBy(asc(storeServicePincodes.etaMinutes));

  const productIds = items.map((item) => item.productId);

  for (const candidate of candidates) {
    const stockRows = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.storeId, candidate.storeId), inArray(inventory.productId, productIds)));

    const stockByProduct = new Map(stockRows.map((row) => [row.productId, row.stockQty]));
    const hasEnoughStock = items.every((item) => (stockByProduct.get(item.productId) ?? 0) >= item.quantity);
    if (hasEnoughStock) return candidate;
  }

  return null;
}
