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
    } finally {
      setSavingProductId(null);
    }
  }

  if (!loading && !user) return <p className="text-neutral-600">Please sign in.</p>;
  if (!stores) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Inventory</h1>

      {stores.length > 1 && (
        <select
          value={storeId ?? ''}
          onChange={(e) => setStoreId(e.target.value)}
          className="mb-4 rounded-md border border-neutral-300 px-3 py-2"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      {stores.length === 1 && <p className="mb-4 text-neutral-600">{stores[0].name}</p>}
      {stores.length === 0 && <p className="text-neutral-500">No store assigned to your account.</p>}

      {rows && (
        <div className="divide-y border border-neutral-200 rounded-md bg-white">
          <div className="p-3 flex justify-between text-xs font-medium text-neutral-500 uppercase">
            <span>Product</span>
            <span>Stock</span>
          </div>
          {rows.map((row) => (
            <div key={row.productId} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{row.product.name}</div>
                <div className="text-xs text-neutral-500">
                  {row.product.sku} · per {row.product.unit}
                </div>
              </div>
              <input
                type="number"
                min={0}
                defaultValue={row.stockQty}
                disabled={savingProductId === row.productId}
                onBlur={(e) => {
                  const value = Math.max(0, parseInt(e.target.value, 10) || 0);
                  if (value !== row.stockQty) updateStock(row.productId, value);
                }}
                className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-right"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
