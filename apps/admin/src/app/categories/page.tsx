"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@matrizo/shared";
import {
  CategoryForm,
  type CategoryFormValues,
} from "@/components/CategoryForm";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { categoryColor } from "@/lib/categoryColors";

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
};

function descendantIds(rows: Category[], id: string) {
  const ids = new Set([id]);
  let before = -1;
  while (before !== ids.size) {
    before = ids.size;
    for (const row of rows)
      if (row.parentId && ids.has(row.parentId)) ids.add(row.id);
  }
  return [...ids];
}

export default function CategoriesPage() {
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!loading && user) load();
  }, [loading, user]);

  async function createCategory(values: CategoryFormValues) {
    setBusy(true);
    setError(null);
    try {
      await api.post("/admin/categories", values);
      setCreating(false);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create category.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateCategory(id: string, values: CategoryFormValues) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/categories/${id}`, values);
      setEditingId(null);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update category.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (
      !confirm(`Delete "${name}"? This only works if it has no products left.`)
    )
      return;
    setError(null);
    try {
      await api.delete(`/admin/categories/${id}`);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not delete category.",
      );
    }
  }

  if (!loading && !user)
    return <p className="text-slate-600">Please sign in.</p>;
  if (loadError && !categories) {
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
  if (!categories) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-brand-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-brand-orange-800"
          >
            + Add category
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      {creating && (
        <div className="mb-4">
          <CategoryForm
            categories={categories}
            onSubmit={createCategory}
            onCancel={() => setCreating(false)}
            busy={busy}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => {
          const color = categoryColor(cat.id);
          return editingId === cat.id ? (
            <CategoryForm
              key={cat.id}
              categories={categories}
              excludedIds={descendantIds(categories, cat.id)}
              initial={{
                slug: cat.slug,
                name: cat.name,
                icon: cat.icon ?? "",
                sortOrder: cat.sortOrder,
                parentId: cat.parentId,
              }}
              onSubmit={(values) => updateCategory(cat.id, values)}
              onCancel={() => setEditingId(null)}
              busy={busy}
            />
          ) : (
            <div
              key={cat.id}
              className={`glass rounded-xl p-4 flex items-center gap-3 border-l-4 ${color.border}`}
            >
              <div
                className={`h-10 w-10 shrink-0 rounded-full ${color.accent} flex items-center justify-center text-lg`}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 truncate">
                  {cat.name}
                </div>
                <div className="text-xs text-slate-500">
                  {cat.parentId
                    ? `${categories.find((c) => c.id === cat.parentId)?.name} / `
                    : ""}
                  {cat.slug}
                </div>
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
