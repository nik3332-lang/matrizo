// Deterministic color per category (by id), reused everywhere a category
// shows up — its own card, a product row's tag, inventory grouping — so a
// given category always reads as the same color across the app.
const PALETTE = [
  { chip: 'bg-violet-100 text-violet-700', accent: 'from-violet-400 to-indigo-400', border: 'border-l-violet-400' },
  { chip: 'bg-fuchsia-100 text-fuchsia-700', accent: 'from-fuchsia-400 to-pink-400', border: 'border-l-fuchsia-400' },
  { chip: 'bg-sky-100 text-sky-700', accent: 'from-sky-400 to-cyan-400', border: 'border-l-sky-400' },
  { chip: 'bg-amber-100 text-amber-700', accent: 'from-amber-400 to-orange-400', border: 'border-l-amber-400' },
  { chip: 'bg-emerald-100 text-emerald-700', accent: 'from-emerald-400 to-teal-400', border: 'border-l-emerald-400' },
  { chip: 'bg-rose-100 text-rose-700', accent: 'from-rose-400 to-red-400', border: 'border-l-rose-400' },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function categoryColor(categoryId: string) {
  return PALETTE[hashIndex(categoryId)];
}
