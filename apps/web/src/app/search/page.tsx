"use client";

// `runtime = 'edge'` removed — see brand/[brand]/page.tsx's comment. It
// 500s this route live on matrizo-web (the OpenNext/Cloudflare Workers
// "Cannot read properties of undefined (reading 'default')" bug also
// documented in components/Icon.tsx), not merely unneeded as previously
// assumed. Removing it surfaced a second, separate build error: Next
// requires useSearchParams() to sit inside a <Suspense> boundary
// regardless of runtime/dynamic settings ("should be wrapped in a
// suspense boundary" / missing-suspense-with-csr-bailout) — the edge
// runtime export had been masking that too. Fixed properly below by
// splitting the part that calls useSearchParams() into its own component
// under <Suspense>.

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { priceForQuantity, type ProductBrand } from "@matrizo/shared";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/Skeleton";
import { categoryIcon } from "@/components/Icon";
import { productCatalogImage } from "@/lib/catalogImages";
import type { ProductSpecs } from "@/lib/specs";

const BRAND_LABELS: Record<ProductBrand, string> = {
  raksha: "Raksha",
  prince: "Prince",
  asian_paints: "Asian Paints",
  birla_opus: "Birla Opus",
  padmavati: "Padmavati",
  others: "Others",
};

type Tier = { minQty: number; pricePerUnit: number };
type Product = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  categoryId: string;
  brand: ProductBrand;
  tiers: Tier[];
  specs: ProductSpecs | null;
  gstInvoiceEligible: boolean;
};
type Category = { id: string; slug: string };

function ResultsSkeleton() {
  return (
    <div className="product-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [response, setResponse] = useState<{
    query: string;
    products: Product[];
  } | null>(null);
  const [failure, setFailure] = useState<{
    query: string;
    message: string;
  } | null>(null);
  const results = !q ? [] : response?.query === q ? response.products : null;
  const error = failure?.query === q ? failure.message : null;
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api
      .get<{ categories: Category[] }>("/categories")
      .then((res) => setCategories(res.categories))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!q) return;
    let current = true;
    api
      .get<{ products: Product[] }>(
        `/products/search?q=${encodeURIComponent(q)}`,
      )
      .then((r) => {
        if (current) {
          setResponse({ query: q, products: r.products });
          setFailure(null);
        }
      })
      .catch(() => {
        if (current)
          setFailure({
            query: q,
            message: "Search is temporarily unavailable. Please try again.",
          });
      });
    return () => {
      current = false;
    };
  }, [q]);

  return (
    <div>
      <h1 className="text-xl font-medium text-stone-900 mb-4">
        {q ? (
          <>
            Results for <span className="text-accent">&ldquo;{q}&rdquo;</span>
          </>
        ) : (
          "Search"
        )}
      </h1>

      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {results && results.length === 0 && (
        <p className="text-stone-500">No products matched.</p>
      )}

      {!results && !error ? (
        <ResultsSkeleton />
      ) : (
        <div className="product-grid">
          {results?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              price={priceForQuantity(product.tiers, 1, product.basePrice)}
              tiers={product.tiers}
              categoryIconName={categoryIcon(
                categories.find((c) => c.id === product.categoryId)?.slug ?? "",
              )}
              imageSrc={productCatalogImage(
                categories.find((c) => c.id === product.categoryId)?.slug ?? "",
                product.name,
              )}
              brandLabel={BRAND_LABELS[product.brand]}
              specs={product.specs}
              gstInvoiceEligible={product.gstInvoiceEligible}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <SearchResults />
    </Suspense>
  );
}
