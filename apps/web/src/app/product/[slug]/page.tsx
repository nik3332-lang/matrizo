// Server component (STAGE 6) — no 'use client'. Fetched at request time on
// the server so a cold WhatsApp-shared link resolves to real content and
// real <title>/OG tags immediately, instead of the blank shell + client
// fetch the whole app used to do. Uses lib/serverApi.ts's serverApiGet()
// (a Cloudflare service-binding call to matrizo-api), not the regular
// URL-based lib/api.ts client — see that file's comment for why.
//
// Deliberately NOT `export const runtime = 'edge'` (unlike the older
// fully-client dynamic routes, which set it only for the legacy
// next-on-pages deploy path per their own comments — irrelevant, but
// harmless, there since those pages have no server-side module graph).
// This page does, and forcing edge runtime here hit the exact OpenNext/
// Cloudflare Workers bug documented in components/Icon.tsx's comment
// ("Cannot read properties of undefined (reading 'default')", production-
// only) — confirmed live: this page 500'd until the edge export was
// removed. The Workers deploy (nodejs_compat) doesn't need it either way.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { priceForQuantity, type ProductBrand } from "@matrizo/shared";
import { serverApiGet } from "@/lib/serverApi";
import { categoryIcon } from "@/lib/categoryIcon";
import { productCatalogImage } from "@/lib/catalogImages";
import { specEntries, type ProductSpecs } from "@/lib/specs";
import { Icon } from "@/components/Icon";
import { CategoryBadge } from "@/components/CategoryBadge";
import { AddToCartPanel } from "./AddToCartPanel";

const BRAND_LABELS: Record<ProductBrand, string> = {
  raksha: "Raksha",
  prince: "Prince",
  asian_paints: "Asian Paints",
  birla_opus: "Birla Opus",
  padmavati: "Padmavati",
  others: "Others",
};

type Tier = { minQty: number; pricePerUnit: number };
type Category = {
  id: string;
  slug: string;
  name: string;
  colour?: string | null;
  colourSelection?: boolean;
};
type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  basePrice: number;
  categoryId: string;
  brand: ProductBrand;
  category: Category | null;
  tiers: Tier[];
  specs: ProductSpecs | null;
  gstInvoiceEligible: boolean;
};

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const res = await serverApiGet<{ product: Product }>(`/products/${slug}`);
    return res.product;
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
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };

  const price = priceForQuantity(product.tiers, 1, product.basePrice);
  const description =
    product.description?.trim() ||
    `${product.name} — ₹${price} / ${product.unit}. ${BRAND_LABELS[product.brand]}. Check local delivery availability with Matrizo.`;

  return {
    title: product.name,
    description,
    openGraph: { title: product.name, description, type: "website" },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return <p className="text-stone-500">Product not found.</p>;

  const unitPrice = priceForQuantity(product.tiers, 1, product.basePrice);
  const specs = specEntries(product.specs);
  const imageSrc = productCatalogImage(
    product.category?.slug ?? "",
    product.name,
  );

  // Product/Offer schema.org markup (STAGE 6) — availability is
  // deliberately omitted rather than guessed: there's no customer-facing
  // stock check yet (see the STAGE 4 note on the product's spec/stock
  // gap), and asserting InStock/OutOfStock without real data would be
  // worse than saying nothing.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    ...(product.description ? { description: product.description } : {}),
    brand: { "@type": "Brand", name: BRAND_LABELS[product.brand] },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: unitPrice,
    },
  };

  return (
    <div className="max-w-3xl pb-24 sm:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="flex items-center gap-1.5 text-sm text-stone-500 mb-4">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        {product.category && (
          <>
            <Icon name="chevronLeft" className="h-3 w-3 rotate-180" />
            <Link
              href={`/category/${product.category.slug}`}
              className="hover:text-accent"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid sm:grid-cols-[220px_1fr] gap-6">
        <div className="relative h-44 sm:h-full min-h-44 rounded-card bg-white border border-line flex items-center justify-center shrink-0 overflow-hidden">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 220px"
              className="object-contain p-6"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-accent-subtle flex items-center justify-center">
              <Icon
                name={categoryIcon(product.category?.slug ?? "")}
                className="h-10 w-10 text-accent"
              />
            </div>
          )}
        </div>

        <div>
          <CategoryBadge category={product.category} />
          <h1 className="text-2xl font-medium text-stone-900">
            {product.name}
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-card border border-line text-stone-600 font-medium">
              {BRAND_LABELS[product.brand]}
            </span>
            {product.gstInvoiceEligible && (
              <span className="text-xs px-2.5 py-1 rounded-card border border-line text-stone-600 font-medium">
                GST invoice
              </span>
            )}
            <span className="text-xs text-stone-400">SKU {product.sku}</span>
          </div>

          {specs.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {specs.map((s) => (
                <div key={s.label} className="flex gap-1.5">
                  <dt className="text-stone-500">{s.label}:</dt>
                  <dd className="text-stone-900 font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {product.description && (
            <p className="mt-3 text-stone-600">{product.description}</p>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
            <Icon
              name="badgeCheck"
              className="h-3.5 w-3.5 text-success shrink-0"
            />
            From {BRAND_LABELS[product.brand]}. Check the specifications to find
            the right fit for your project.
          </div>

          <AddToCartPanel
            productId={product.id}
            colourSelection={product.category?.colourSelection}
            productSlug={slug}
            unit={product.unit}
            basePrice={product.basePrice}
            tiers={product.tiers}
          />
        </div>
      </div>

      {product.tiers.length > 0 && (
        <div className="glass mt-8 rounded-card divide-y divide-line text-sm overflow-hidden max-w-md">
          <div className="px-4 py-2.5 flex justify-between font-medium text-stone-700 bg-stone-50">
            <span>Quantity</span>
            <span>Price / {product.unit}</span>
          </div>
          <div className="px-4 py-2.5 flex justify-between">
            <span>1 – {product.tiers[0].minQty - 1}</span>
            <span>₹{product.basePrice}</span>
          </div>
          {[...product.tiers]
            .sort((a, b) => a.minQty - b.minQty)
            .map((tier, i, arr) => (
              <div
                key={tier.minQty}
                className="px-4 py-2.5 flex justify-between"
              >
                <span>
                  {tier.minQty}
                  {arr[i + 1] ? ` – ${arr[i + 1].minQty - 1}` : "+"}
                </span>
                <span className="font-medium text-accent">
                  ₹{tier.pricePerUnit}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
