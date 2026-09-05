type Tier = { minQty: number; pricePerUnit: number };

// Picks the best applicable bulk-pricing tier for a given quantity (e.g.
// "buy 15+ at X price"). Falls back to the product's base price when no
// tier applies. Shared between the Worker API (source of truth for order
// totals) and the web/admin/mobile clients (live price preview).
export function priceForQuantity(tiers: Tier[], quantity: number, basePrice: number): number {
  const applicable = tiers
    .filter((t) => quantity >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];
  return applicable ? applicable.pricePerUnit : basePrice;
}
