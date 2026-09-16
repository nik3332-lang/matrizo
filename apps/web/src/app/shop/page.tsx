"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BRAND_LABELS,
  priceForQuantity,
  PRODUCT_BRANDS,
} from "@matrizo/shared";
import { api } from "@/lib/api";
import type { CatalogProduct, Category } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/Skeleton";
import { categoryIcon } from "@/lib/categoryIcon";
import { productCatalogImage } from "@/lib/catalogImages";
export default function ShopPage() {
  const [products, setProducts] = useState<CatalogProduct[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("name");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all([
      api.get<{ products: CatalogProduct[] }>("/products"),
      api.get<{ categories: Category[] }>("/categories"),
    ])
      .then(([p, c]) => {
        if (live) {
          setProducts(p.products);
          setCategories(c.categories);
          setError("");
        }
      })
      .catch(() => {
        if (live) setError("We couldn’t load the products. Please try again.");
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  const visible = useMemo(() => {
    const ids = new Set(category ? [category] : []);
    let before = -1;
    while (before !== ids.size) {
      before = ids.size;
      for (const c of categories)
        if (c.parentId && ids.has(c.parentId)) ids.add(c.id);
    }
    return (products ?? [])
      .filter(
        (p) =>
          (!category || ids.has(p.categoryId)) &&
          (!brand || p.brand === brand) &&
          p.name.toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) =>
        sort === "low"
          ? a.basePrice - b.basePrice
          : sort === "high"
            ? b.basePrice - a.basePrice
            : a.name.localeCompare(b.name),
      );
  }, [products, categories, query, category, brand, sort]);
  return (
    <div>
      <div className="shop-heading">
        <span className="eyebrow">THE MATRIZO COLLECTION</span>
        <h1>Find your next great detail.</h1>
        <p>
          Sanitary ware, bathroom fittings, pipes and paints. All your project
          essentials, together.
        </p>
      </div>
      <div className="shop-toolbar">
        <input
          aria-label="Filter products"
          placeholder="Find something for your space…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option value={c.id} key={c.id}>
              {c.parentId ? "↳ " : ""}
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        >
          <option value="">All brands</option>
          {PRODUCT_BRANDS.map((b) => (
            <option key={b} value={b}>
              {BRAND_LABELS[b]}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Name: A–Z</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
        <span>{products ? `${visible.length} products` : "Loading…"}</span>
      </div>
      {error && (
        <div className="notice" role="alert">
          {error}
          <button onClick={() => setAttempt((v) => v + 1)}>Try again</button>
        </div>
      )}
      <div className="product-grid">
        {!products &&
          !error &&
          Array.from({ length: 10 }, (_, i) => <ProductCardSkeleton key={i} />)}
        {visible.map((p) => {
          const cat = categories.find((c) => c.id === p.categoryId);
          return (
            <ProductCard
              key={p.id}
              product={p}
              price={priceForQuantity(p.tiers, 1, p.basePrice)}
              tiers={p.tiers}
              brandLabel={BRAND_LABELS[p.brand]}
              categoryIconName={categoryIcon(cat?.slug ?? "")}
              imageSrc={productCatalogImage(cat?.slug ?? "", p.name)}
              specs={p.specs}
              gstInvoiceEligible={p.gstInvoiceEligible}
            />
          );
        })}
      </div>
      {products && !visible.length && (
        <div className="empty-state">
          <p>No products match these filters.</p>
          <button
            className="button-primary mt-4"
            onClick={() => {
              setQuery("");
              setCategory("");
              setBrand("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
