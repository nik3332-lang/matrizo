'use client';

import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { ProductForm } from '@/components/ProductForm';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { categoryColor } from '@/lib/categoryColors';

type Tier = { minQty: number; pricePerUnit: number };
type Category = { id: string; name: string };
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
  active: boolean;
  tiers: Tier[];
};

export default function ProductsPage() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    api.get<{ categories: Category[] }>('/categories').then((res) => setCategories(res.categories));
    api.get<{ products: Product[] }>('/admin/products').then((res) => setProducts(res.products));
  }

  useEffect(() => {
    if (!loading && user) load();
  }, [loading, user]);

  async function createProduct(values: Omit<Product, 'id'>) {
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/products', values);
      setCreating(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create product.');
    } finally {
      setBusy(false);
    }
  }

  async function updateProduct(id: string, values: Omit<Product, 'id'>) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/products/${id}`, values);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update product.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This removes it from the catalog and every store's inventory.`)) return;
    setError(null);
    setNotice(null);
    try {
      const res = await api.delete<{ ok: true; deactivatedInstead: boolean }>(`/admin/products/${id}`);
      if (res.deactivatedInstead) {
        setNotice(`"${name}" has past orders, so it's been hidden from customers instead of deleted (order history stays intact).`);
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete product.');
    }
  }

  if (!loading && !user) return <p className="text-slate-600">Please sign in.</p>;
  if (!categories || !products) return <p className="text-slate-500">Loading…</p>;

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        {!creating && categories.length > 0 && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:from-amber-700 hover:to-yellow-700"
          >
            + Add product
          </button>
        )}
      </div>

      {categories.length === 0 && (
        <p className="text-slate-500 mb-4">Add a category first — products need one to belong to.</p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="glass rounded-xl p-4 border-l-4 border-l-stone-400">
          <div className="text-2xl font-bold text-stone-700">{products.length}</div>
          <div className="text-xs text-slate-500">Total products</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-emerald-400">
          <div className="text-2xl font-bold text-emerald-700">{products.filter((p) => p.active).length}</div>
          <div className="text-xs text-slate-500">Visible to customers</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-amber-400">
          <div className="text-2xl font-bold text-amber-700">{products.filter((p) => p.tiers.length > 0).length}</div>
          <div className="text-xs text-slate-500">With bulk pricing</div>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      {notice && <p className="mb-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 ring-1 ring-amber-200">{notice}</p>}

      {creating && (
        <div className="mb-4">
          <ProductForm categories={categories} onSubmit={createProduct} onCancel={() => setCreating(false)} busy={busy} />
        </div>
      )}

      <div className="space-y-3">
        {products.map((product) =>
          editingId === product.id ? (
            <ProductForm
              key={product.id}
              categories={categories}
              initial={{
                sku: product.sku,
                slug: product.slug,
                categoryId: product.categoryId,
                name: product.name,
                description: product.description ?? '',
                unit: product.unit,
                basePrice: product.basePrice,
                imageUrl: product.imageUrl ?? '',
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
                  <span className="font-semibold text-slate-900">{product.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(product.categoryId).chip}`}>
                    {categoryName(product.categoryId)}
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
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {product.sku} · ₹{product.basePrice}/{product.unit}
                </div>
              </div>
              <button
                onClick={() => setEditingId(product.id)}
                className="text-xs px-3 py-1.5 rounded-full font-medium text-amber-700 hover:bg-amber-50"
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
          )
        )}
        {products.length === 0 && <p className="text-slate-500">No products yet.</p>}
      </div>
    </div>
  );
}
