'use client';

import { useState } from 'react';

import { PRODUCT_BRANDS, type ProductBrand } from '@matrizo/shared';

const BRAND_LABELS: Record<ProductBrand, string> = { raksha: 'Raksha', prince: 'Prince', others: 'Others' };

type Tier = { minQty: number; pricePerUnit: number };
type ProductFormValues = {
  sku: string;
  slug: string;
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  basePrice: number;
  imageUrl: string;
  brand: ProductBrand;
  active: boolean;
  tiers: Tier[];
};

const EMPTY: ProductFormValues = {
  sku: '',
  slug: '',
  categoryId: '',
  name: '',
  description: '',
  unit: '',
  basePrice: 0,
  imageUrl: '',
  brand: 'others',
  active: true,
  tiers: [],
};

export function ProductForm({
  categories,
  initial,
  onSubmit,
  onCancel,
  busy,
}: {
  categories: { id: string; name: string }[];
  initial?: Partial<ProductFormValues>;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [values, setValues] = useState<ProductFormValues>({
    ...EMPTY,
    categoryId: categories[0]?.id ?? '',
    ...initial,
  });

  function updateTier(index: number, patch: Partial<Tier>) {
    setValues((v) => ({
      ...v,
      tiers: v.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="glass rounded-2xl p-5 space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700">
          Name
          <input
            required
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Category
          <select
            required
            value={values.categoryId}
            onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-medium text-slate-700">
          SKU
          <input
            required
            value={values.sku}
            onChange={(e) => setValues((v) => ({ ...v, sku: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Slug
          <input
            required
            value={values.slug}
            onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Unit
          <input
            required
            value={values.unit}
            placeholder="bag, piece, coil…"
            onChange={(e) => setValues((v) => ({ ...v, unit: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-700 w-full sm:w-1/3">
        Brand
        <select
          value={values.brand}
          onChange={(e) => setValues((v) => ({ ...v, brand: e.target.value as ProductBrand }))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
        >
          {PRODUCT_BRANDS.map((b) => (
            <option key={b} value={b}>
              {BRAND_LABELS[b]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Description
        <textarea
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700">
          Base price (₹)
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={values.basePrice}
            onChange={(e) => setValues((v) => ({ ...v, basePrice: parseFloat(e.target.value) || 0 }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Image URL
          <input
            value={values.imageUrl}
            onChange={(e) => setValues((v) => ({ ...v, imageUrl: e.target.value }))}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))}
          className="h-4 w-4 rounded border-slate-300 text-brand-orange-700 focus:ring-brand-orange-400"
        />
        Active (visible to customers)
      </label>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Bulk-pricing tiers</span>
          <button
            type="button"
            onClick={() => setValues((v) => ({ ...v, tiers: [...v.tiers, { minQty: 0, pricePerUnit: 0 }] }))}
            className="text-xs px-2.5 py-1 rounded-full font-medium text-brand-orange-700 hover:bg-brand-orange-50"
          >
            + Add tier
          </button>
        </div>
        <div className="space-y-2">
          {values.tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                placeholder="Min qty"
                value={tier.minQty}
                onChange={(e) => updateTier(i, { minQty: parseInt(e.target.value, 10) || 0 })}
                className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
              <span className="text-slate-400 text-sm">+ units at ₹</span>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                value={tier.pricePerUnit}
                onChange={(e) => updateTier(i, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200 outline-none"
              />
              <button
                type="button"
                onClick={() => setValues((v) => ({ ...v, tiers: v.tiers.filter((_, j) => j !== i) }))}
                className="text-xs px-2 py-1 rounded-full text-rose-500 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))}
          {values.tiers.length === 0 && <p className="text-xs text-slate-400">No bulk tiers — base price applies always.</p>}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-brand-orange-800 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save product'}
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
