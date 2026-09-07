// Deterministic color per category (by id), reused everywhere a category
// shows up — its own card, a product row's tag, inventory grouping — so a
// given category always reads as the same color across the app. Built
// entirely from the Matrizo brand scale (purple / orange / coral / cream)
// to match the poster palette rather than a full rainbow.
const PALETTE = [
  { chip: 'bg-brand-orange-100 text-brand-orange-800', accent: 'from-brand-orange-500 to-brand-orange-700', border: 'border-l-brand-orange-500' },
  { chip: 'bg-brand-purple-100 text-brand-purple-800', accent: 'from-brand-purple-500 to-brand-purple-800', border: 'border-l-brand-purple-500' },
  { chip: 'bg-brand-coral-100 text-brand-coral-800', accent: 'from-brand-coral-400 to-brand-orange-600', border: 'border-l-brand-coral-400' },
  { chip: 'bg-stone-200 text-stone-700', accent: 'from-stone-400 to-brand-purple-400', border: 'border-l-stone-400' },
  { chip: 'bg-brand-purple-50 text-brand-purple-600', accent: 'from-brand-purple-300 to-brand-purple-600', border: 'border-l-brand-purple-300' },
  { chip: 'bg-brand-orange-50 text-brand-orange-600', accent: 'from-brand-orange-300 to-brand-purple-500', border: 'border-l-brand-orange-300' },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function categoryColor(categoryId: string) {
  return PALETTE[hashIndex(categoryId)];
}
