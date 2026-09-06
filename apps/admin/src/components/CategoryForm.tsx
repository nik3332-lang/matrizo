'use client';

import { useState } from 'react';

type CategoryFormValues = {
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
};

const EMPTY: CategoryFormValues = { slug: '', name: '', icon: '', sortOrder: 0 };

export function CategoryForm({
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: Partial<CategoryFormValues>;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [values, setValues] = useState<CategoryFormValues>({ ...EMPTY, ...initial });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="glass rounded-xl p-4 space-y-3"
    >
      <div className="flex gap-3">
        <label className="flex-1 text-sm font-medium text-slate-700">
          Name
          <input
            required
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </label>
        <label className="w-20 text-sm font-medium text-slate-700">
          Icon
          <input
            value={values.icon}
            onChange={(e) => setValues((v) => ({ ...v, icon: e.target.value }))}
            placeholder="🔧"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <label className="flex-1 text-sm font-medium text-slate-700">
          Slug
          <input
            required
            value={values.slug}
            onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))}
            placeholder="tools"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </label>
        <label className="w-28 text-sm font-medium text-slate-700">
          Sort order
          <input
            type="number"
            value={values.sortOrder}
            onChange={(e) => setValues((v) => ({ ...v, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
