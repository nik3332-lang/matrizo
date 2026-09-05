'use client';

import { use, useEffect, useState } from 'react';

import { ApiError, ORDER_STATUSES, type OrderStatus } from '@matrizo/shared';
import { api } from '@/lib/api';

type OrderItem = { id: string; productName: string; quantity: number; unitPrice: number };
type StatusEvent = { status: string; createdAt: string; actorUserId: string | null };
type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string;
  storeId: string;
  createdAt: string;
};

const FORWARD_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'picked', 'dispatched', 'delivered'];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function load() {
    api
      .get<{ order: Order; items: OrderItem[]; events: StatusEvent[] }>(`/orders/${id}`)
      .then((res) => {
        setOrder(res.order);
        setItems(res.items);
        setEvents(res.events);
      })
      .catch(() => setError('Order not found.'));
  }

  useEffect(load, [id]);

  async function setStatus(status: OrderStatus) {
    setUpdating(true);
    setError(null);
    try {
      await api.patch(`/orders/${id}/status`, { status });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    } finally {
      setUpdating(false);
    }
  }

  if (error && !order) return <p className="text-neutral-500">{error}</p>;
  if (!order) return <p className="text-neutral-500">Loading…</p>;

  const currentIndex = FORWARD_STATUSES.indexOf(order.status);
  const nextStatus = currentIndex >= 0 && currentIndex < FORWARD_STATUSES.length - 1 ? FORWARD_STATUSES[currentIndex + 1] : null;
  const canCancel = order.status !== 'delivered' && order.status !== 'cancelled';

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold">Order #{order.id.slice(0, 8)}</h1>
      <p className="text-sm text-neutral-500">Store: {order.storeId}</p>

      <div className="mt-4 flex items-center gap-3">
        <span className="rounded-full bg-neutral-900 text-white text-xs px-3 py-1 capitalize">{order.status}</span>
        {nextStatus && (
          <button
            onClick={() => setStatus(nextStatus)}
            disabled={updating}
            className="rounded-md bg-neutral-900 text-white px-4 py-1.5 text-sm font-medium disabled:opacity-60 capitalize"
          >
            Mark {nextStatus}
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setStatus('cancelled')}
            disabled={updating}
            className="rounded-md border border-red-300 text-red-600 px-4 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            Cancel order
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 divide-y border border-neutral-200 rounded-md bg-white">
        {items.map((item) => (
          <div key={item.id} className="p-3 flex justify-between text-sm">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span>₹{item.unitPrice * item.quantity}</span>
          </div>
        ))}
        <div className="p-3 flex justify-between font-medium">
          <span>Total ({order.paymentMethod.toUpperCase()})</span>
          <span>₹{order.totalAmount}</span>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-neutral-700 mb-2">History</h2>
        <div className="text-sm text-neutral-500 space-y-1">
          {events.map((ev, i) => (
            <div key={i}>
              {new Date(ev.createdAt).toLocaleString()} — <span className="capitalize">{ev.status}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Valid transitions: {ORDER_STATUSES.join(' → ')}
      </p>
    </div>
  );
}
