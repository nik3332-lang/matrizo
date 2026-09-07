'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Order = {
  id: string;
  status: string;
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
  if (orders.length === 0) return <p className="text-stone-500">No orders yet.</p>;

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
              <div className="font-semibold capitalize text-brand-orange-700">{order.status}</div>
              <div className="text-sm text-stone-500">₹{order.totalAmount}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
