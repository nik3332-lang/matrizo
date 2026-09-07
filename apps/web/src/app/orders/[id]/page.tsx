'use client';

// Required by the old Pages/next-on-pages deploy path only (Workers'
// matrizo-web deploy doesn't need this) — every dynamic route must opt
// into the Edge runtime or that pipeline's build fails outright.
export const runtime = 'edge';

import { use, useEffect, useState } from 'react';

import { ApiError, ORDER_STATUSES } from '@matrizo/shared';
import { api, wsUrl } from '@/lib/api';

type OrderItem = { id: string; productName: string; quantity: number; unitPrice: number };
type StatusEvent = { status: string; createdAt: string };
type Order = { id: string; status: string; totalAmount: number; paymentMethod: string; createdAt: string };

const TRACKABLE_STATUSES = ORDER_STATUSES.filter((s) => s !== 'cancelled');

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api
      .get<{ order: Order; items: OrderItem[]; events: StatusEvent[] }>(`/orders/${id}`)
      .then((res) => {
        setOrder(res.order);
        setItems(res.items);
        setEvents(res.events);
      })
      .catch(() => setError('Order not found.'));
  }, [id]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl(`/orders/${id}/track`));
    ws.addEventListener('open', () => setLive(true));
    ws.addEventListener('close', () => setLive(false));
    ws.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data) as { status: string; at: string };
        setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
        setEvents((prev) =>
          prev.some((ev) => ev.status === data.status) ? prev : [...prev, { status: data.status, createdAt: data.at }]
        );
      } catch {
        // ignore malformed frames
      }
    });
    return () => ws.close();
  }, [id]);

  async function cancelOrder() {
    if (!confirm('Cancel this order?')) return;
    setCancelling(true);
    setError(null);
    try {
      await api.patch(`/orders/${id}/status`, { status: 'cancelled' });
      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this order.');
    } finally {
      setCancelling(false);
    }
  }

  if (error && !order) return <p className="text-stone-500">{error}</p>;
  if (!order) return <p className="text-stone-500">Loading…</p>;

  const currentIndex = TRACKABLE_STATUSES.indexOf(order.status as (typeof TRACKABLE_STATUSES)[number]);
  const canCancel = order.status === 'placed' || order.status === 'confirmed';

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900">Order #{order.id.slice(0, 8)}</h1>
        <span className={`text-xs font-medium ${live ? 'text-emerald-600' : 'text-stone-400'}`}>
          {live ? '● live' : '○ connecting…'}
        </span>
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {canCancel && (
        <button
          onClick={cancelOrder}
          disabled={cancelling}
          className="mt-3 text-sm font-medium text-rose-600 hover:underline disabled:opacity-60"
        >
          {cancelling ? 'Cancelling…' : 'Cancel order'}
        </button>
      )}

      {order.status === 'cancelled' ? (
        <p className="mt-4 text-rose-600 font-medium">This order was cancelled.</p>
      ) : (
        <div className="glass mt-6 rounded-xl p-4">
          <ol className="flex justify-between text-xs">
            {TRACKABLE_STATUSES.map((status, i) => (
              <li key={status} className="flex-1 flex flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full ${
                    i <= currentIndex ? 'bg-gradient-to-br from-brand-orange-500 to-brand-purple-500' : 'bg-stone-200'
                  }`}
                />
                <span className={`mt-2 capitalize ${i <= currentIndex ? 'text-brand-orange-700 font-medium' : 'text-stone-400'}`}>
                  {status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="glass mt-8 divide-y divide-stone-200/70 rounded-xl">
        {items.map((item) => (
          <div key={item.id} className="p-3 flex justify-between text-sm">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span>₹{item.unitPrice * item.quantity}</span>
          </div>
        ))}
        <div className="p-3 flex justify-between font-semibold text-stone-900">
          <span>Total ({order.paymentMethod.toUpperCase()})</span>
          <span className="text-brand-orange-700">₹{order.totalAmount}</span>
        </div>
      </div>

      <div className="mt-6 text-sm text-stone-500 space-y-1">
        {events.map((ev, i) => (
          <div key={i}>
            {new Date(ev.createdAt).toLocaleString()} — <span className="capitalize font-medium text-stone-700">{ev.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
