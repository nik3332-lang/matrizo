'use client';

import { use, useEffect, useState } from 'react';

import { ORDER_STATUSES } from '@matrizo/shared';
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

  if (error) return <p className="text-neutral-500">{error}</p>;
  if (!order) return <p className="text-neutral-500">Loading…</p>;

  const currentIndex = TRACKABLE_STATUSES.indexOf(order.status as (typeof TRACKABLE_STATUSES)[number]);

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order #{order.id.slice(0, 8)}</h1>
        <span className={`text-xs ${live ? 'text-emerald-600' : 'text-neutral-400'}`}>
          {live ? '● live' : '○ connecting…'}
        </span>
      </div>

      {order.status === 'cancelled' ? (
        <p className="mt-4 text-red-600 font-medium">This order was cancelled.</p>
      ) : (
        <ol className="mt-6 flex justify-between text-xs">
          {TRACKABLE_STATUSES.map((status, i) => (
            <li key={status} className="flex-1 flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${i <= currentIndex ? 'bg-neutral-900' : 'bg-neutral-200'}`}
              />
              <span className={`mt-2 capitalize ${i <= currentIndex ? 'text-neutral-900' : 'text-neutral-400'}`}>
                {status.replace('_', ' ')}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8 divide-y border border-neutral-200 rounded-md bg-white">
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

      <div className="mt-6 text-sm text-neutral-500 space-y-1">
        {events.map((ev, i) => (
          <div key={i}>
            {new Date(ev.createdAt).toLocaleString()} — <span className="capitalize">{ev.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
