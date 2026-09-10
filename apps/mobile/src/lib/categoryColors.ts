// Deterministic color per category (by id) — same hashing/order as
// apps/web and apps/admin's categoryColors.ts, so a given category reads
// as the same identity across every surface. React Native has no CSS
// gradient support, so `gradient` here is a literal hex pair for
// expo-linear-gradient instead of a Tailwind `from-X to-Y` class string.
const PALETTE = [
  { chip: 'bg-brand-orange-100 text-brand-orange-800', gradient: ['#fd7210', '#ef3d21'] as const },
  { chip: 'bg-brand-purple-100 text-brand-purple-800', gradient: ['#85469b', '#4e1775'] as const },
  { chip: 'bg-brand-coral-100 text-brand-coral-800', gradient: ['#e99e8b', '#e75924'] as const },
  { chip: 'bg-stone-200 text-stone-700', gradient: ['#a8a29e', '#9c5fb2'] as const },
  { chip: 'bg-brand-purple-50 text-brand-purple-600', gradient: ['#b885cb', '#65346c'] as const },
  { chip: 'bg-brand-orange-50 text-brand-orange-600', gradient: ['#ffa35f', '#85469b'] as const },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function categoryColor(categoryId: string) {
  return PALETTE[hashIndex(categoryId)];
}
