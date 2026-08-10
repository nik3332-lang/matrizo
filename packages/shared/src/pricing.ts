type Tier = { minQty: number; pricePerUnit: number };

// Picks the best applicable bulk-pricing tier for a given quantity, matching
// HomeRun-style "15+ / 30+ / 50+" volume discounts. Falls back to the
// product's base price when no tier applies. Shared between the Worker API
// (source of truth for order totals) and the app (live price preview).
export function priceForQuantity(tiers: Tier[], quantity: number, basePrice: number): number {
  const applicable = tiers
    .filter((t) => quantity >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];
  return applicable ? applicable.pricePerUnit : basePrice;
}
