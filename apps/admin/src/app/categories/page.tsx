'use client';

import { useEffect, useState } from 'react';

import { ApiError } from '@matrizo/shared';
import { CategoryForm } from '@/components/CategoryForm';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { categoryColor } from '@/lib/categoryColors';

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
};

export default function CategoriesPage() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<{ categories: Category[] }>('/categories').then((res) => setCategories(res.categories));
  }

  useEffect(() => {
    if (!loading && user) load();
  }, [loading, user]);

  async function createCategory(values: { slug: string; name: string; icon: string; sortOrder: number }) {
    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/categories', values);
      setCreating(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create category.');
    } finally {
      setBusy(false);
    }
  }

  async function updateCategory(id: string, values: { slug: string; name: string; icon: string; sortOrder: number }) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/categories/${id}`, values);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update category.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This only works if it has no products left.`)) return;
    setError(null);
    try {
      await api.delete(`/admin/categories/${id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete category.');
    }
  }

  if (!loading && !user) return <p className="text-slate-600">Please sign in.</p>;
  if (!categories) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-gradient-to-r from-brand-orange-600 to-brand-purple-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:from-brand-orange-700 hover:to-brand-purple-700"
          >
            + Add category
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      {creating && (
        <div className="mb-4">
          <CategoryForm onSubmit={createCategory} onCancel={() => setCreating(false)} busy={busy} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => {
          const color = categoryColor(cat.id);
          return editingId === cat.id ? (
            <CategoryForm
              key={cat.id}
              initial={{ slug: cat.slug, name: cat.name, icon: cat.icon ?? '', sortOrder: cat.sortOrder }}
              onSubmit={(values) => updateCategory(cat.id, values)}
              onCancel={() => setEditingId(null)}
              busy={busy}
            />
          ) : (
            <div key={cat.id} className={`glass rounded-xl p-4 flex items-center gap-3 border-l-4 ${color.border}`}>
              <div
                className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${color.accent} flex items-center justify-center text-lg shadow-md`}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{cat.name}</div>
                <div className="text-xs text-slate-500">/{cat.slug}</div>
              </div>
              <button
                onClick={() => setEditingId(cat.id)}
                className="text-xs px-3 py-1.5 rounded-full font-medium text-brand-orange-700 hover:bg-brand-orange-50"
              >
                Edit
              </button>
              <button
                onClick={() => deleteCategory(cat.id, cat.name)}
                className="text-xs px-3 py-1.5 rounded-full font-medium text-rose-600 hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
