/**
 * Uploaded catalogue images take precedence over these local fallbacks.
 * Manufacturer packshots are matched to exact ranges, never to a brand alone.
 */
const CATEGORY_IMAGES: Record<string, string> = {
  upvc: "/images/catalog/upvc-pipes-fittings.png",
  cpvc: "/images/catalog/cpvc-pipes-fittings.png",
  pvc: "/images/catalog/pvc-pipes-fittings.png",
  paints: "/images/catalog/brands/asian-apcolite.png",
  "paint-materials-tools": "/images/catalog/paint-materials.png",
};

const PAINT_PACKSHOTS: Record<string, string> = {
  "asian paints apcolite premium emulsion": "asian-apcolite.png",
  "asian paints royale luxury emulsion": "asian-royale.png",
  "asian paints apex dust proof": "asian-apex.png",
  "birla opus one pure elegance shine": "birla-pure-elegance.webp",
  "birla opus style power bright shine": "birla-power-bright.webp",
  "birla opus power bright shine": "birla-power-bright.webp",
  "birla opus wall n roof 10 (waterproofing)": "birla-wall-roof.jpg",
  "birla opus pro fresh primer interior": "birla-pro-fresh.webp",
  "birla opus perfect start primer": "birla-perfect-start.webp",
  "birla opus power fit": "birla-power-fit.webp",
  "birla opus neostar shine": "birla-neostar.webp",
};

export function manufacturerCatalogImage(
  categorySlug: string,
  productName: string,
): string | null {
  const range = productName.toLowerCase().trim().replace(/\s+/g, " ")
    .replace(/\s+\d+(?:\.\d+)?\s*(?:l|ltr|kg)$/i, "");
  const file = categorySlug === "paints"
    ? PAINT_PACKSHOTS[range]
    : categorySlug === "paint-materials-tools" && range === "wallmaxx wall putty"
      ? "jk-wallmaxx.png"
      : null;
  return file ? `/images/catalog/brands/${file}` : null;
}

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
  const packshot = manufacturerCatalogImage(categorySlug, productName);
  if (packshot) return packshot;
  // Unknown paints must not inherit another manufacturer's packaging.
  if (categorySlug === "paints") return null;
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
