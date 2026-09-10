'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { OrderStatus } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { STATUS_COLORS } from '@/lib/statusColors';
import { Icon } from '@/components/Icon';

type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
};

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!loading && user) {
      api.get<{ orders: Order[] }>('/orders').then((res) => setOrders(res.orders));
    }
  }, [loading, user]);

  if (!loading && !user) return <p className="text-stone-600">Please log in to see your orders.</p>;
  if (!orders) return <p className="text-stone-500">Loading…</p>;
  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto h-14 w-14 rounded-full bg-brand-orange-50 flex items-center justify-center">
          <Icon name="package" className="h-7 w-7 text-brand-orange-400" />
        </div>
        <p className="mt-4 text-stone-500">No orders yet.</p>
        <Link href="/" className="mt-1 inline-block text-brand-orange-700 font-medium hover:underline">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900 mb-4">Your orders</h1>
      <div className="space-y-2">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="glass block rounded-xl p-4 flex items-center justify-between hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div>
              <div className="font-semibold text-stone-900">Order #{order.id.slice(0, 8)}</div>
              <div className="text-sm text-stone-500">{new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[order.status]}`}>
                {order.status}
              </span>
              <div className="text-sm text-stone-500 mt-1">₹{order.totalAmount}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
