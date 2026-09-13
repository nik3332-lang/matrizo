// Mirrors ProductSpecs in apps/api/src/db/schema.ts. Every field is
// optional and admin-entered (see apps/admin's ProductForm) — nothing
// here is inferred from the product name or guessed. A product with no
// specs set yet renders no spec line at all, rather than a blank or a
// guessed value.
export type ProductSpecs = {
  volumeLitres?: number;
  finish?: 'matt' | 'satin' | 'gloss' | 'enamel' | 'primer';
  surface?: 'interior' | 'exterior' | 'both';
  coverageSqFtPerLitre?: number;
  size?: string;
  material?: string;
  classOrStandard?: string;
  packQuantity?: number;
};

const FINISH_LABEL: Record<NonNullable<ProductSpecs['finish']>, string> = {
  matt: 'Matt',
  satin: 'Satin',
  gloss: 'Gloss',
  enamel: 'Enamel',
  primer: 'Primer',
};

const SURFACE_LABEL: Record<NonNullable<ProductSpecs['surface']>, string> = {
  interior: 'Interior',
  exterior: 'Exterior',
  both: 'Interior/Exterior',
};

// Ordered {label, value} pairs for whichever fields are actually set —
// paints and sanitary/plumbing products populate different subsets, so
// this reads whatever's there rather than assuming a fixed shape.
export function specEntries(specs: ProductSpecs | null | undefined): { label: string; value: string }[] {
  if (!specs) return [];
  const out: { label: string; value: string }[] = [];
  if (specs.volumeLitres != null) out.push({ label: 'Volume', value: `${specs.volumeLitres} L` });
  if (specs.finish) out.push({ label: 'Finish', value: FINISH_LABEL[specs.finish] });
  if (specs.surface) out.push({ label: 'Surface', value: SURFACE_LABEL[specs.surface] });
  if (specs.size) out.push({ label: 'Size', value: specs.size });
  if (specs.material) out.push({ label: 'Material', value: specs.material });
  if (specs.classOrStandard) out.push({ label: 'Standard', value: specs.classOrStandard });
  if (specs.coverageSqFtPerLitre != null) out.push({ label: 'Coverage', value: `${specs.coverageSqFtPerLitre} sq ft/L` });
  if (specs.packQuantity != null) out.push({ label: 'Pack', value: `Pack of ${specs.packQuantity}` });
  return out;
}

// Dense one-line summary for a product card — values only, no labels.
// Returns null when there's nothing to show, so the card can omit the
// line entirely instead of rendering blank space.
export function specLine(specs: ProductSpecs | null | undefined): string | null {
  const entries = specEntries(specs);
  return entries.length > 0 ? entries.map((e) => e.value).join(' · ') : null;
}
