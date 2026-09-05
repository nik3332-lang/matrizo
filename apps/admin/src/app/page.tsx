'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ORDER_STATUSES } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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
      <p className="text-neutral-600">
        <Link href="/login" className="underline">
          Sign in
        </Link>{' '}
        to view the order queue.
      </p>
    );
  }
  if (!orders) return <p className="text-neutral-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Order queue</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full border capitalize ${
              filter === f ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 text-neutral-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered?.length === 0 && <p className="text-neutral-500">No orders here.</p>}

      <div className="divide-y border border-neutral-200 rounded-md bg-white">
        {filtered?.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="p-4 flex items-center justify-between hover:bg-neutral-50"
          >
            <div>
              <div className="font-medium">#{order.id.slice(0, 8)}</div>
              <div className="text-sm text-neutral-500">{new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="font-medium capitalize">{order.status}</div>
              <div className="text-sm text-neutral-500">
                ₹{order.totalAmount} · {order.paymentMethod.toUpperCase()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
