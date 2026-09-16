// Server component (STAGE 6) — same reasoning as the product page: a
// category link shared cold needs real content and real metadata on
// first paint, not a client fetch behind a skeleton. Deliberately NOT
// `export const runtime = 'edge'` — see the product page's comment on
// why that broke this exact kind of page in production. Uses
// lib/serverApi.ts's serverApiGet() (a Cloudflare service-binding call
// to matrizo-api) rather than the URL-based lib/api.ts client — see that
// file's comment for why.

import type { Metadata } from "next";
import Image from "next/image";

import { PRODUCT_BRANDS } from "@matrizo/shared";
import { serverApiGet } from "@/lib/serverApi";
import { categoryIcon } from "@/lib/categoryIcon";
import { Icon } from "@/components/Icon";
import { BrandFilterGrid, type Product } from "./BrandFilterGrid";

type Category = { id: string; slug: string; name: string; icon: string | null };

// Real photography, category-level only — see public/images/CREDITS.md.
// It's a real photo of stacked plastic pipe, not any specific SKU on this
// page (the actual products are small fittings — elbows, tees, unions),
// so it's deliberately not used on individual product cards, where a
// pipe-yard photo at this scale would misrepresent what's being sold.
// Categories without an entry here keep the plain icon header only.
const CATEGORY_BANNERS: Partial<
  Record<string, { src: string; width: number; height: number; alt: string }>
> = {
  upvc: {
    src: "/images/upvc-pipes-category.jpg",
    width: 900,
    height: 596,
    alt: "Stacked UPVC pipes",
  },
};

async function getCategory(
  slug: string,
): Promise<{ category: Category; products: Product[] } | null> {
  try {
    return await serverApiGet<{ category: Category; products: Product[] }>(
      `/categories/${slug}/products`,
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategory(slug);
  if (!data) return { title: "Category not found" };
  return {
    title: data.category.name,
    description: `Shop ${data.category.name} — delivered fast from your nearest Matrizo dark store.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCategory(slug);

  if (!data) return <p className="text-stone-500">Category not found.</p>;

  const brandsPresent = PRODUCT_BRANDS.filter((b) =>
    data.products.some((p) => p.brand === b),
  );
  const banner = CATEGORY_BANNERS[slug];

  return (
    <div>
      {banner && (
        <div className="mb-6 rounded-card overflow-hidden border border-line">
          <Image
            src={banner.src}
            alt={banner.alt}
            width={banner.width}
            height={banner.height}
            priority
            className="w-full h-40 sm:h-56 object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
          <Icon name={categoryIcon(slug)} className="h-5 w-5 text-accent" />
        </div>
        <h1 className="text-xl font-medium text-stone-900">
          {data.category.name}
        </h1>
      </div>

      <BrandFilterGrid
        products={data.products}
        brandsPresent={brandsPresent}
        categorySlug={slug}
      />
    </div>
  );
}
