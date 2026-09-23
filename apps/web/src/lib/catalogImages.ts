/**
 * Category-level catalogue artwork is deliberately generic: it gives the
 * storefront visual recognition without pretending to be a manufacturer
 * packshot. A real product image from the catalog should take precedence
 * whenever one is available.
 */
const CATEGORY_IMAGES: Record<string, string> = {
  upvc: "/images/catalog/upvc-pipes-fittings.png",
  cpvc: "/images/catalog/cpvc-pipes-fittings.png",
  pvc: "/images/catalog/pvc-pipes-fittings.png",
  paints: "/images/catalog/paint-supplies.png",
  "paint-materials-tools": "/images/catalog/paint-materials.png",
};

export function categoryCatalogImage(slug: string): string | null {
  return CATEGORY_IMAGES[slug] ?? null;
}

/**
 * A small set of generic item-level images prevents a pipe, elbow and valve
 * from looking identical while retaining a safe fallback for the long tail
 * of fittings that do not yet have supplier photography.
 */
export function productCatalogImage(
  categorySlug: string,
  productName: string,
): string | null {
  if (["upvc", "cpvc", "pvc"].includes(categorySlug)) {
    const name = productName.toLowerCase();
    if (name.includes("ball valve") || name.includes(" valve"))
      return `/images/catalog/${categorySlug}-ball-valve.png`;
    if (name.includes("lbo") || name.includes("elbow"))
      return `/images/catalog/${categorySlug}-elbow.png`;
    if (name.includes("pipe"))
      return `/images/catalog/${categorySlug}-pipe.png`;
  }

  return categoryCatalogImage(categorySlug);
}
