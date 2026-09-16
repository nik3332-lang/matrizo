"use client";

import { useEffect, useState } from "react";

import { ApiError, PRODUCT_BRANDS, type ProductBrand } from "@matrizo/shared";
import { ProductForm } from "@/components/ProductForm";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { categoryColor } from "@/lib/categoryColors";

const BRAND_LABELS: Record<ProductBrand, string> = {
  raksha: "Raksha",
  prince: "Prince",
  asian_paints: "Asian Paints",
  birla_opus: "Birla Opus",
  padmavati: "Padmavati",
  others: "Others",
};
const BRAND_CHIP: Record<ProductBrand, string> = {
  raksha: "bg-brand-purple-100 text-brand-purple-800",
  prince: "bg-brand-orange-100 text-brand-orange-800",
  asian_paints: "bg-sky-100 text-sky-800",
  birla_opus: "bg-emerald-100 text-emerald-800",
  padmavati: "bg-amber-100 text-amber-800",
  others: "bg-stone-200 text-stone-700",
};

type Tier = { minQty: number; pricePerUnit: number };
type Category = { id: string; name: string; slug: string };
type ProductSpecs = {
  volumeLitres?: number;
  finish?: "matt" | "satin" | "gloss" | "enamel" | "primer";
  surface?: "interior" | "exterior" | "both";
  coverageSqFtPerLitre?: number;
  size?: string;
  material?: string;
  classOrStandard?: string;
  packQuantity?: number;
};
type Product = {
  id: string;
  sku: string;
  slug: string;
  categoryId: string;
  name: string;
  description: string | null;
  unit: string;
  basePrice: number;
  imageUrl: string | null;
  brand: ProductBrand;
  specs: ProductSpecs | null;
  gstInvoiceEligible: boolean;
  active: boolean;
  tiers: Tier[];
};

type BulkImportResult = {
  imported: number;
  failed: number;
  results: { row: number; sku: string; ok: boolean; error?: string }[];
};

// Deliberately simple (splits on commas, no quoted-field support) — the CSV
// template below never needs quoting since none of its columns contain
// commas. Fine for this; swap for a real parser if that stops being true.
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

const CSV_TEMPLATE =
  "sku,slug,name,description,unit,basePrice,categorySlug,brand,imageUrl\nEX-001,example-product,Example Product,Optional description,piece,99.5,upvc,others,\n";

export default function ProductsPage() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [brandFilter, setBrandFilter] = useState<ProductBrand | "all">("all");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [savedPriceId, setSavedPriceId] = useState<string | null>(null);
  // Distinct from `error` (set only by write actions below) — this one
  // covers the initial load, which previously had no .catch() at all: any
  // failure (expired token, wrong role, network blip) left categories/
  // products stuck at null forever, so the page just showed "Loading…"
  // with no way out. Now it surfaces what happened and offers a retry.
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setLoadError(null);
    api
      .get<{ categories: Category[] }>("/categories")
      .then((res) => setCategories(res.categories))
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load categories.",
        ),
      );
    api
      .get<{ products: Product[] }>("/admin/products")
      .then((res) => setProducts(res.products))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setLoadError(
            "Your account doesn't have admin access to the product catalog.",
          );
        } else {
          setLoadError(
            err instanceof ApiError ? err.message : "Could not load products.",
          );
        }
      });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!loading && user) load();
  }, [loading, user]);

  async function createProduct(values: Omit<Product, "id">) {
    setBusy(true);
    setError(null);
    try {
      await api.post("/admin/products", values);
      setCreating(false);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create product.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateProduct(id: string, values: Omit<Product, "id">) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/products/${id}`, values);
      setEditingId(null);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update product.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Fast per-row price edit — the full form (Edit button) still covers
  // everything else, but bumping just the price shouldn't need opening
  // the whole thing. Same inline-save pattern as the inventory page's
  // stock quantity field.
  async function updatePrice(id: string, basePrice: number) {
    setSavingPriceId(id);
    setError(null);
    try {
      await api.patch(`/admin/products/${id}`, { basePrice });
      setProducts(
        (prev) =>
          prev?.map((p) => (p.id === id ? { ...p, basePrice } : p)) ?? null,
      );
      setSavedPriceId(id);
      setTimeout(() => setSavedPriceId(null), 1500);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update price.",
      );
    } finally {
      setSavingPriceId(null);
    }
  }

  async function deleteProduct(id: string, name: string) {
    if (
      !confirm(
        `Delete "${name}"? This removes it from the catalog and every store's inventory.`,
      )
    )
      return;
    setError(null);
    setNotice(null);
    try {
      const res = await api.delete<{ ok: true; deactivatedInstead: boolean }>(
        `/admin/products/${id}`,
      );
      if (res.deactivatedInstead) {
        setNotice(
          `"${name}" has past orders, so it's been hidden from customers instead of deleted (order history stays intact).`,
        );
      }
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not delete product.",
      );
    }
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after fixing it
    if (!file || !categories) return;

    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);

      // The `categories` state here only carries {id, name} — the CSV is
      // written in terms of slugs (what an admin actually knows), so map
      // categorySlug -> categoryId via a fresh fetch that includes slugs.
      const catRes = await api.get<{
        categories: { id: string; slug: string }[];
      }>("/categories");
      const slugToId = new Map(catRes.categories.map((c) => [c.slug, c.id]));

      const payload = rows
        .map((row) => {
          const categoryId = slugToId.get(row.categorySlug);
          if (
            !categoryId ||
            !row.sku ||
            !row.slug ||
            !row.name ||
            !row.unit ||
            !row.basePrice
          )
            return null;
          const brand = PRODUCT_BRANDS.includes(row.brand as ProductBrand)
            ? (row.brand as ProductBrand)
            : "others";
          return {
            sku: row.sku,
            slug: row.slug,
            name: row.name,
            description: row.description || undefined,
            unit: row.unit,
            basePrice: parseFloat(row.basePrice),
            categoryId,
            brand,
            imageUrl: row.imageUrl || undefined,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (payload.length === 0) {
        setError(
          "No valid rows found — check the CSV matches the template columns and categorySlug values.",
        );
        return;
      }

      const res = await api.post<BulkImportResult>(
        "/admin/products/bulk",
        payload,
      );
      setImportResult(res);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not import CSV.");
    } finally {
      setImporting(false);
    }
  }

  if (!loading && !user)
    return <p className="text-slate-600">Please sign in.</p>;
  if (loadError && (!categories || !products)) {
    return (
      <div className="glass rounded-xl p-4">
        <p className="text-sm text-rose-600">{loadError}</p>
        <button
          onClick={load}
          className="mt-2 text-xs px-3 py-1.5 rounded-full font-medium text-brand-orange-700 hover:bg-brand-orange-50"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!categories || !products)
    return <p className="text-slate-500">Loading…</p>;

  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";
  const visibleProducts =
    brandFilter === "all"
      ? products
      : products.filter((p) => p.brand === brandFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <div className="flex items-center gap-2">
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
            download="matrizo-products-template.csv"
            className="text-xs px-3 py-1.5 rounded-full font-medium text-brand-orange-700 hover:bg-brand-orange-50"
          >
            Download CSV template
          </a>
          <label className="text-xs px-3 py-1.5 rounded-full font-medium text-brand-orange-700 hover:bg-brand-orange-50 cursor-pointer">
            {importing ? "Importing…" : "Import CSV"}
            <input
              type="file"
              accept=".csv"
              onChange={importCsv}
              disabled={importing}
              className="hidden"
            />
          </label>
          {!creating && categories.length > 0 && (
            <button
              onClick={() => setCreating(true)}
              className="rounded-full bg-brand-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-brand-orange-800"
            >
              + Add product
            </button>
          )}
        </div>
      </div>

      {categories.length === 0 && (
        <p className="text-slate-500 mb-4">
          Add a category first — products need one to belong to.
        </p>
      )}

      {importResult && (
        <div className="mb-4 glass rounded-xl p-4">
          <div className="text-sm font-medium text-stone-900">
            Imported {importResult.imported} of{" "}
            {importResult.imported + importResult.failed} rows.
          </div>
          {importResult.failed > 0 && (
            <ul className="mt-2 text-xs text-rose-600 space-y-1">
              {importResult.results
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={r.row}>
                    Row {r.row + 2} ({r.sku}): {r.error}
                  </li>
                ))}
            </ul>
          )}
          <button
            onClick={() => setImportResult(null)}
            className="mt-2 text-xs text-stone-500 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="glass rounded-xl p-4 border-l-4 border-l-stone-400">
          <div className="text-2xl font-bold text-stone-700">
            {products.length}
          </div>
          <div className="text-xs text-slate-500">Total products</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-emerald-400">
          <div className="text-2xl font-bold text-emerald-700">
            {products.filter((p) => p.active).length}
          </div>
          <div className="text-xs text-slate-500">Visible to customers</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-brand-orange-400">
          <div className="text-2xl font-bold text-brand-orange-700">
            {products.filter((p) => p.tiers.length > 0).length}
          </div>
          <div className="text-xs text-slate-500">With bulk pricing</div>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      {notice && (
        <p className="mb-3 text-sm text-brand-orange-700 bg-brand-orange-50 rounded-lg px-3 py-2 ring-1 ring-brand-orange-200">
          {notice}
        </p>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setBrandFilter("all")}
          className={`text-xs px-3 py-1.5 rounded-full font-medium ring-1 transition-colors ${
            brandFilter === "all"
              ? "bg-slate-900 text-white ring-slate-900"
              : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"
          }`}
        >
          All brands
        </button>
        {PRODUCT_BRANDS.map((b) => (
          <button
            key={b}
            onClick={() => setBrandFilter(b)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ring-1 transition-colors ${
              brandFilter === b
                ? BRAND_CHIP[b] + " ring-2"
                : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"
            }`}
          >
            {BRAND_LABELS[b]} ({products.filter((p) => p.brand === b).length})
          </button>
        ))}
      </div>

      {creating && (
        <div className="mb-4">
          <ProductForm
            categories={categories}
            onSubmit={createProduct}
            onCancel={() => setCreating(false)}
            busy={busy}
          />
        </div>
      )}

      <div className="space-y-3">
        {visibleProducts.map((product) =>
          editingId === product.id ? (
            <ProductForm
              key={product.id}
              categories={categories}
              initial={{
                sku: product.sku,
                slug: product.slug,
                categoryId: product.categoryId,
                name: product.name,
                description: product.description ?? "",
                unit: product.unit,
                basePrice: product.basePrice,
                imageUrl: product.imageUrl ?? "",
                brand: product.brand,
                specs: product.specs ?? {},
                gstInvoiceEligible: product.gstInvoiceEligible,
                active: product.active,
                tiers: product.tiers,
              }}
              onSubmit={(values) => updateProduct(product.id, values)}
              onCancel={() => setEditingId(null)}
              busy={busy}
            />
          ) : (
            <div
              key={product.id}
              className={`glass rounded-xl p-4 flex items-center gap-4 border-l-4 ${categoryColor(product.categoryId).border}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">
                    {product.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(product.categoryId).chip}`}
                  >
                    {categoryName(product.categoryId)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${BRAND_CHIP[product.brand]}`}
                  >
                    {BRAND_LABELS[product.brand]}
                  </span>
                  {!product.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                      Hidden
                    </span>
                  )}
                  {product.tiers.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      {product.tiers.length} bulk tier(s)
                    </span>
                  )}
                  {product.gstInvoiceEligible && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">
                      GST invoice
                    </span>
                  )}
                  {!product.specs || Object.keys(product.specs).length === 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      No specs yet
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-slate-500 mt-1">{product.sku}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {savedPriceId === product.id && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    Saved ✓
                  </span>
                )}
                <span className="text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={product.basePrice}
                  disabled={savingPriceId === product.id}
                  onBlur={(e) => {
                    const value = Math.max(0, parseFloat(e.target.value) || 0);
                    if (value !== product.basePrice)
                      updatePrice(product.id, value);
                  }}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
                />
                <span className="text-slate-400 text-xs">/{product.unit}</span>
              </div>
              <button
                onClick={() => setEditingId(product.id)}
                className="text-xs px-3 py-1.5 rounded-full font-medium text-brand-orange-700 hover:bg-brand-orange-50"
              >
                Edit
              </button>
              <button
                onClick={() => deleteProduct(product.id, product.name)}
                className="text-xs px-3 py-1.5 rounded-full font-medium text-rose-600 hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
          ),
        )}
        {visibleProducts.length === 0 && (
          <p className="text-slate-500">
            {products.length === 0
              ? "No products yet."
              : "No products for this brand."}
          </p>
        )}
      </div>
    </div>
  );
}
