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
import { categoryCatalogImage } from "@/lib/catalogImages";
import { Icon } from "@/components/Icon";
import { CategoryBadge } from "@/components/CategoryBadge";
import { BrandFilterGrid, type Product } from "./BrandFilterGrid";

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  colour?: string | null;
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
  const banner = ["upvc", "cpvc", "pvc"].includes(slug)
    ? categoryCatalogImage(slug)
    : null;

  return (
    <div>
      {banner && (
        <div className="mb-6 overflow-hidden bg-white">
          <Image
            src={banner}
            alt={data.category.name}
            width={1280}
            height={1280}
            priority
            className="w-full h-40 sm:h-56 object-contain p-3"
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
          <Icon name={categoryIcon(slug)} className="h-5 w-5 text-accent" />
        </div>
        <h1 className="text-xl font-medium text-stone-900">
          {data.category.name}
          <CategoryBadge category={data.category} />
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
