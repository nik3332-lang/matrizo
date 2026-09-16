/**
 * Category-level catalogue artwork is deliberately generic: it gives the
 * storefront visual recognition without pretending to be a manufacturer
 * packshot. A real product image from the catalog should take precedence
 * whenever one is available.
 */
const CATEGORY_IMAGES: Record<string, string> = {
  upvc: '/images/catalog/pipes-fittings.png',
  cpvc: '/images/catalog/pipes-fittings.png',
  paints: '/images/catalog/paint-supplies.png',
  'paint-materials-tools': '/images/catalog/paint-materials.png',
};

export function categoryCatalogImage(slug: string): string | null {
  return CATEGORY_IMAGES[slug] ?? null;
}

/**
 * A small set of generic item-level images prevents a pipe, elbow and valve
 * from looking identical while retaining a safe fallback for the long tail
 * of fittings that do not yet have supplier photography.
 */
export function productCatalogImage(categorySlug: string, productName: string): string | null {
  if (categorySlug === 'upvc' || categorySlug === 'cpvc') {
    const name = productName.toLowerCase();
    if (name.includes('ball valve') || name.includes(' valve')) return '/images/catalog/ball-valve.png';
    if (name.includes('lbo') || name.includes('elbow')) return '/images/catalog/elbow.png';
    if (name.includes('pipe')) return '/images/catalog/pipe.png';
  }

  return categoryCatalogImage(categorySlug);
}
