// Deterministic color per category (by id) — same hashing/order as
// apps/web and apps/admin's categoryColors.ts, so a given category reads
// as the same identity across every surface. A single solid hex color, not
// a gradient — flat, restrained color reads as a professional app; a
// gradient on every tile read as a hobby-project demo.
const PALETTE = [
  { chip: 'bg-brand-orange-100 text-brand-orange-800', color: '#ef3d21' },
  { chip: 'bg-brand-purple-100 text-brand-purple-800', color: '#4e1775' },
  { chip: 'bg-brand-coral-100 text-brand-coral-800', color: '#c75f47' },
  { chip: 'bg-stone-200 text-stone-700', color: '#78716c' },
  { chip: 'bg-brand-purple-50 text-brand-purple-600', color: '#85469b' },
  { chip: 'bg-brand-orange-50 text-brand-orange-600', color: '#e75924' },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function categoryColor(categoryId: string) {
  return PALETTE[hashIndex(categoryId)];
}
