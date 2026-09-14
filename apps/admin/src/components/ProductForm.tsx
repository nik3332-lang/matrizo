'use client';

import { useState } from 'react';

import { PRODUCT_BRANDS, type ProductBrand } from '@matrizo/shared';

const BRAND_LABELS: Record<ProductBrand, string> = {
  raksha: 'Raksha',
  prince: 'Prince',
  asian_paints: 'Asian Paints',
  birla_opus: 'Birla Opus',
  others: 'Others',
};

const FINISH_OPTIONS = ['matt', 'satin', 'gloss', 'enamel', 'primer'] as const;
const SURFACE_OPTIONS = ['interior', 'exterior', 'both'] as const;

type Tier = { minQty: number; pricePerUnit: number };
type ProductSpecs = {
  volumeLitres?: number;
  finish?: (typeof FINISH_OPTIONS)[number];
  surface?: (typeof SURFACE_OPTIONS)[number];
  coverageSqFtPerLitre?: number;
  size?: string;
  material?: string;
  classOrStandard?: string;
  packQuantity?: number;
};
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
  specs: ProductSpecs;
  gstInvoiceEligible: boolean;
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
  specs: {},
  gstInvoiceEligible: false,
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
  categories: { id: string; name: string; slug: string }[];
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

  function updateSpec<K extends keyof ProductSpecs>(key: K, value: ProductSpecs[K]) {
    setValues((v) => ({ ...v, specs: { ...v.specs, [key]: value } }));
  }

  // Which spec fields apply depends on the category — a paint has no
  // material/size, a pipe fitting has no finish/coverage. Decided by slug,
  // not name text, since slugs are the stable admin-facing identifier.
  const isPaint = categories.find((c) => c.id === values.categoryId)?.slug === 'paints';

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

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.active}
            onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange-700 focus:ring-brand-orange-400"
          />
          Active (visible to customers)
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.gstInvoiceEligible}
            onChange={(e) => setValues((v) => ({ ...v, gstInvoiceEligible: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange-700 focus:ring-brand-orange-400"
          />
          GST invoice available
        </label>
      </div>

      {/* Spec attributes — the customer-facing spec line on the product
         card/page reads directly from these. Left blank, the site shows
         no spec line rather than guessing, so this is the only place a
         real one gets set. */}
      <div className="rounded-lg border border-slate-200 p-3 space-y-3">
        <div className="text-sm font-medium text-slate-700">Specs {isPaint ? '(paint)' : '(sanitary / plumbing)'}</div>
        {isPaint ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-slate-600">
              Volume (litres)
              <input
                type="number"
                min={0}
                step="0.1"
                value={values.specs.volumeLitres ?? ''}
                onChange={(e) => updateSpec('volumeLitres', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Finish
              <select
                value={values.specs.finish ?? ''}
                onChange={(e) => updateSpec('finish', (e.target.value || undefined) as ProductSpecs['finish'])}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200"
              >
                <option value="">—</option>
                {FINISH_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Surface
              <select
                value={values.specs.surface ?? ''}
                onChange={(e) => updateSpec('surface', (e.target.value || undefined) as ProductSpecs['surface'])}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200"
              >
                <option value="">—</option>
                {SURFACE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Coverage (sq ft / litre)
              <input
                type="number"
                min={0}
                step="1"
                value={values.specs.coverageSqFtPerLitre ?? ''}
                onChange={(e) => updateSpec('coverageSqFtPerLitre', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200"
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-slate-600">
              Size
              <input
                placeholder={'e.g. 3/4"'}
                value={values.specs.size ?? ''}
                onChange={(e) => updateSpec('size', e.target.value || undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Material
              <input
                placeholder="e.g. UPVC, brass"
                value={values.specs.material ?? ''}
                onChange={(e) => updateSpec('material', e.target.value || undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Class / standard
              <input
                placeholder="e.g. IS 4985"
                value={values.specs.classOrStandard ?? ''}
                onChange={(e) => updateSpec('classOrStandard', e.target.value || undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Pack quantity
              <input
                type="number"
                min={1}
                step="1"
                value={values.specs.packQuantity ?? ''}
                onChange={(e) => updateSpec('packQuantity', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-orange-500 focus:ring-2 focus:ring-brand-orange-200"
              />
            </label>
          </div>
        )}
      </div>

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
