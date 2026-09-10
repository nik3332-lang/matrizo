// Deterministic color per category (by id), reused everywhere a category
// shows up — its own card, a product row's tag, inventory grouping — so a
// given category always reads as the same color across the app. `accent` is
// a single solid fill (not a gradient) — flat, restrained color reads as a
// professional ops tool; gradients everywhere read as a hobby-project demo.
const PALETTE = [
  { chip: 'bg-brand-orange-100 text-brand-orange-800', accent: 'bg-brand-orange-700', border: 'border-l-brand-orange-700' },
  { chip: 'bg-brand-purple-100 text-brand-purple-800', accent: 'bg-brand-purple-800', border: 'border-l-brand-purple-800' },
  { chip: 'bg-brand-coral-100 text-brand-coral-800', accent: 'bg-brand-coral-600', border: 'border-l-brand-coral-600' },
  { chip: 'bg-stone-200 text-stone-700', accent: 'bg-stone-500', border: 'border-l-stone-500' },
  { chip: 'bg-brand-purple-50 text-brand-purple-600', accent: 'bg-brand-purple-500', border: 'border-l-brand-purple-500' },
  { chip: 'bg-brand-orange-50 text-brand-orange-600', accent: 'bg-brand-orange-600', border: 'border-l-brand-orange-600' },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function categoryColor(categoryId: string) {
  return PALETTE[hashIndex(categoryId)];
}
