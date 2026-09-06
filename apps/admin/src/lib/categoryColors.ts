// Deterministic color per category (by id), reused everywhere a category
// shows up — its own card, a product row's tag, inventory grouping — so a
// given category always reads as the same color across the app. All warm
// tones (beige/tan/gold/amber/yellow) to match the white/beige/light-yellow
// palette rather than a full rainbow.
const PALETTE = [
  { chip: 'bg-amber-100 text-amber-800', accent: 'from-amber-400 to-yellow-500', border: 'border-l-amber-400' },
  { chip: 'bg-yellow-100 text-yellow-800', accent: 'from-yellow-400 to-amber-400', border: 'border-l-yellow-400' },
  { chip: 'bg-orange-100 text-orange-800', accent: 'from-orange-400 to-amber-500', border: 'border-l-orange-400' },
  { chip: 'bg-stone-200 text-stone-700', accent: 'from-stone-400 to-amber-300', border: 'border-l-stone-400' },
  { chip: 'bg-lime-100 text-lime-800', accent: 'from-lime-400 to-yellow-400', border: 'border-l-lime-400' },
  { chip: 'bg-stone-300 text-stone-800', accent: 'from-amber-300 to-stone-400', border: 'border-l-stone-500' },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function categoryColor(categoryId: string) {
  return PALETTE[hashIndex(categoryId)];
}
