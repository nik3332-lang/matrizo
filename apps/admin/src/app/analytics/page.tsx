'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { STATUS_COLORS } from '@/lib/statusColors';

type Summary = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  ordersByStatus: Record<string, number>;
  topProducts: { productId: string; productName: string; quantity: number; revenue: number }[];
  lowStock: { storeId: string; productId: string; productName: string; stockQty: number }[];
};

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      api.get<Summary>('/admin/analytics/summary').then(setSummary);
    }
  }, [authLoading, user]);

  if (!authLoading && user?.role !== 'admin') {
    return <p className="text-stone-600">Only admins can view analytics.</p>;
  }
  if (!summary) return <p className="text-stone-500">Loading…</p>;

  const maxTopQty = Math.max(1, ...summary.topProducts.map((p) => p.quantity));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-stone-900">Analytics</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 border-l-4 border-l-emerald-400">
          <div className="text-2xl font-bold text-emerald-700">₹{summary.totalRevenue.toFixed(2)}</div>
          <div className="text-xs text-stone-500">Total revenue</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-amber-400">
          <div className="text-2xl font-bold text-amber-700">{summary.totalOrders}</div>
          <div className="text-xs text-stone-500">Orders (excl. cancelled)</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-orange-400">
          <div className="text-2xl font-bold text-orange-700">₹{summary.avgOrderValue.toFixed(2)}</div>
          <div className="text-xs text-stone-500">Average order value</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Orders by status</h2>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(summary.ordersByStatus).map(([status, count]) => (
            <span
              key={status}
              className={`text-sm px-3 py-1.5 rounded-full font-medium capitalize ring-1 ${
                STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? 'bg-stone-100 text-stone-700 ring-stone-200'
              }`}
            >
              {status}: {count}
            </span>
          ))}
          {Object.keys(summary.ordersByStatus).length === 0 && <p className="text-stone-500">No orders yet.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Top products</h2>
        {summary.topProducts.length === 0 && <p className="text-stone-500">No sales yet.</p>}
        <div className="space-y-2">
          {summary.topProducts.map((p) => (
            <div key={p.productId} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-stone-900">{p.productName}</span>
                <span className="text-stone-500">
                  {p.quantity} sold · ₹{p.revenue.toFixed(2)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500"
                  style={{ width: `${(p.quantity / maxTopQty) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">Low stock (all stores)</h2>
        {summary.lowStock.length === 0 && <p className="text-stone-500">Nothing running low.</p>}
        <div className="space-y-2">
          {summary.lowStock.map((row) => (
            <div
              key={`${row.storeId}-${row.productId}`}
              className={`glass rounded-xl p-3 flex items-center justify-between border-l-4 ${
                row.stockQty === 0 ? 'border-l-rose-400' : 'border-l-amber-400'
              }`}
            >
              <span className="text-sm font-medium text-stone-900">{row.productName}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  row.stockQty === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {row.stockQty} left
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
