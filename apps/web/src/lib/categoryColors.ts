// Deterministic color per category (by id), matching the same palette used
// in the admin portal for a consistent brand feel. Built entirely from the
// Matrizo brand scale (purple / orange / coral / cream) so every category
// still reads as visually distinct without introducing off-brand hues.
const PALETTE = [
  { chip: 'bg-brand-orange-100 text-brand-orange-800', accent: 'from-brand-orange-500 to-brand-orange-700' },
  { chip: 'bg-brand-purple-100 text-brand-purple-800', accent: 'from-brand-purple-500 to-brand-purple-800' },
  { chip: 'bg-brand-coral-100 text-brand-coral-800', accent: 'from-brand-coral-400 to-brand-orange-600' },
  { chip: 'bg-stone-200 text-stone-700', accent: 'from-stone-400 to-brand-purple-400' },
  { chip: 'bg-brand-purple-50 text-brand-purple-600', accent: 'from-brand-purple-300 to-brand-purple-600' },
  { chip: 'bg-brand-orange-50 text-brand-orange-600', accent: 'from-brand-orange-300 to-brand-purple-500' },
];

function hashIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % PALETTE.length;
}

export function categoryColor(categoryId: string) {
  return PALETTE[hashIndex(categoryId)];
}
