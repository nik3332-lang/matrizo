// Deterministic color per category (by id), matching the same palette used
// in the admin portal for a consistent brand feel.
const PALETTE = [
  { chip: 'bg-amber-100 text-amber-800', accent: 'from-amber-400 to-yellow-500' },
  { chip: 'bg-yellow-100 text-yellow-800', accent: 'from-yellow-400 to-amber-400' },
  { chip: 'bg-orange-100 text-orange-800', accent: 'from-orange-400 to-amber-500' },
  { chip: 'bg-stone-200 text-stone-700', accent: 'from-stone-400 to-amber-300' },
  { chip: 'bg-lime-100 text-lime-800', accent: 'from-lime-400 to-yellow-400' },
  { chip: 'bg-stone-300 text-stone-800', accent: 'from-amber-300 to-stone-400' },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function categoryColor(categoryId: string) {
  return PALETTE[hashIndex(categoryId)];
}
