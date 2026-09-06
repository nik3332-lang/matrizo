'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Store = { id: string; name: string };
type InventoryRow = {
  productId: string;
  stockQty: number;
  product: { name: string; sku: string; unit: string };
};

export default function InventoryPage() {
  const { user, loading } = useAuth();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [rows, setRows] = useState<InventoryRow[] | null>(null);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      api.get<{ stores: Store[] }>('/inventory/stores').then((res) => {
        setStores(res.stores);
        setStoreId(res.stores[0]?.id ?? null);
      });
    }
  }, [loading, user]);

  useEffect(() => {
    if (!storeId) return;
    setRows(null);
    api.get<{ inventory: InventoryRow[] }>(`/inventory/${storeId}`).then((res) => setRows(res.inventory));
  }, [storeId]);

  async function updateStock(productId: string, stockQty: number) {
    if (!storeId) return;
    setSavingProductId(productId);
    try {
      await api.put(`/inventory/${storeId}`, { productId, stockQty });
      setRows((prev) => prev?.map((r) => (r.productId === productId ? { ...r, stockQty } : r)) ?? null);
      setSavedProductId(productId);
      setTimeout(() => setSavedProductId(null), 1500);
    } finally {
      setSavingProductId(null);
    }
  }

  if (!loading && !user) return <p className="text-slate-600">Please sign in.</p>;
  if (!stores) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Inventory</h1>

      {stores.length > 1 && (
        <select
          value={storeId ?? ''}
          onChange={(e) => setStoreId(e.target.value)}
          className="mb-4 rounded-lg border border-slate-300 px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {stores.length === 1 && <p className="mb-4 text-amber-700 font-medium">{stores[0].name}</p>}
      {stores.length === 0 && <p className="text-slate-500">No store assigned to your account.</p>}

      {rows && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="glass rounded-xl p-4 border-l-4 border-l-yellow-400">
              <div className="text-2xl font-bold text-yellow-800">{rows.length}</div>
              <div className="text-xs text-slate-500">SKUs stocked</div>
            </div>
            <div className="glass rounded-xl p-4 border-l-4 border-l-amber-400">
              <div className="text-2xl font-bold text-amber-700">{rows.filter((r) => r.stockQty > 0 && r.stockQty <= 10).length}</div>
              <div className="text-xs text-slate-500">Running low</div>
            </div>
            <div className="glass rounded-xl p-4 border-l-4 border-l-rose-400">
              <div className="text-2xl font-bold text-rose-700">{rows.filter((r) => r.stockQty === 0).length}</div>
              <div className="text-xs text-slate-500">Out of stock</div>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((row) => {
              const out = row.stockQty === 0;
              const low = !out && row.stockQty <= 10;
              const border = out ? 'border-l-rose-400' : low ? 'border-l-amber-400' : 'border-l-emerald-400';
              return (
                <div key={row.productId} className={`glass rounded-xl p-4 flex items-center justify-between border-l-4 ${border}`}>
                  <div>
                    <div className="font-medium text-slate-900">{row.product.name}</div>
                    <div className="text-xs text-slate-500">
                      {row.product.sku} · per {row.product.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {out && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                        Out of stock
                      </span>
                    )}
                    {low && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        Low
                      </span>
                    )}
                    {savedProductId === row.productId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        Saved ✓
                      </span>
                    )}
                    <input
                      type="number"
                      min={0}
                      defaultValue={row.stockQty}
                      disabled={savingProductId === row.productId}
                      onBlur={(e) => {
                        const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                        if (value !== row.stockQty) updateStock(row.productId, value);
                      }}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
