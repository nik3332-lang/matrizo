'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ORDER_STATUSES } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { STATUS_COLORS } from '@/lib/statusColors';

const STATUS_BORDER: Record<string, string> = {
  placed: 'border-l-brand-purple-400',
  confirmed: 'border-l-brand-orange-400',
  picked: 'border-l-brand-coral-400',
  dispatched: 'border-l-stone-400',
  delivered: 'border-l-emerald-400',
  cancelled: 'border-l-rose-400',
};

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
};

const FILTERS = ['all', ...ORDER_STATUSES] as const;

export default function OrderQueuePage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  useEffect(() => {
    if (!loading && user) {
      api.get<{ orders: Order[] }>('/orders').then((res) => setOrders(res.orders));
    }
  }, [loading, user]);

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders?.filter((o) => o.status === filter)),
    [orders, filter]
  );

  if (!loading && !user) {
    return (
      <p className="text-slate-600">
        <Link href="/login" className="text-brand-orange-700 font-medium underline">
          Sign in
        </Link>{' '}
        to view the order queue.
      </p>
    );
  }
  if (!orders) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Order queue</h1>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="glass rounded-xl p-4 border-l-4 border-l-brand-purple-400">
          <div className="text-2xl font-bold text-brand-purple-800">{orders.length}</div>
          <div className="text-xs text-slate-500">Total orders</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-emerald-400">
          <div className="text-2xl font-bold text-emerald-700">
            ₹{orders.reduce((sum, o) => sum + o.totalAmount, 0)}
          </div>
          <div className="text-xs text-slate-500">Total value</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-brand-orange-400">
          <div className="text-2xl font-bold text-brand-orange-700">
            {orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length}
          </div>
          <div className="text-xs text-slate-500">In progress</div>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full font-medium ring-1 transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white ring-slate-900'
              : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
          }`}
        >
          All
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ring-1 transition-colors ${
              filter === s ? STATUS_COLORS[s] + ' ring-2' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered?.length === 0 && <p className="text-slate-500">No orders here.</p>}

      <div className="space-y-2">
        {filtered?.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className={`glass block rounded-xl p-4 border-l-4 ${STATUS_BORDER[order.status] ?? 'border-l-slate-300'} hover:ring-brand-orange-300 hover:-translate-y-0.5 transition-all flex items-center justify-between`}
          >
            <div>
              <div className="font-semibold text-slate-900">#{order.id.slice(0, 8)}</div>
              <div className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <div className="text-sm text-slate-500">
                  ₹{order.totalAmount} · {order.paymentMethod.toUpperCase()}
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ring-1 ${
                  STATUS_COLORS[order.status as keyof typeof STATUS_COLORS]
                }`}
              >
                {order.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
