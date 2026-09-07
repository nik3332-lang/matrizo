'use client';

import { use, useEffect, useState } from 'react';

import { ApiError, ORDER_STATUSES, type OrderStatus } from '@matrizo/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { STATUS_COLORS, STATUS_SOLID_COLORS } from '@/lib/statusColors';

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
type Delivery = { partnerId: string; partnerName: string | null; assignedAt: string; completedAt: string | null };
type DeliveryPartner = { id: string; name: string | null; storeId: string | null; role: string };

const FORWARD_STATUSES: OrderStatus[] = ['placed', 'confirmed', 'picked', 'dispatched', 'delivered'];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [partners, setPartners] = useState<DeliveryPartner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function load() {
    api
      .get<{ order: Order; items: OrderItem[]; events: StatusEvent[]; delivery: Delivery | null }>(`/orders/${id}`)
      .then((res) => {
        setOrder(res.order);
        setItems(res.items);
        setEvents(res.events);
        setDelivery(res.delivery);
      })
      .catch(() => setError('Order not found.'));
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'store_staff') {
      api.get<{ users: DeliveryPartner[] }>('/admin/users').then((res) => setPartners(res.users));
    }
  }, [user]);

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

  async function assignPartner(partnerId: string) {
    if (!partnerId) return;
    setUpdating(true);
    setError(null);
    try {
      await api.patch(`/orders/${id}/assign-delivery`, { deliveryPartnerUserId: partnerId });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not assign delivery partner.');
    } finally {
      setUpdating(false);
    }
  }

  if (error && !order) return <p className="text-slate-500">{error}</p>;
  if (!order || !user) return <p className="text-slate-500">Loading…</p>;

  const isDeliveryPartner = user.role === 'delivery_partner';
  const canManageOrders = user.role === 'admin' || user.role === 'store_staff';

  const currentIndex = FORWARD_STATUSES.indexOf(order.status);
  const nextStatus =
    currentIndex >= 0 && currentIndex < FORWARD_STATUSES.length - 1 ? FORWARD_STATUSES[currentIndex + 1] : null;
  const canCancel = canManageOrders && order.status !== 'delivered' && order.status !== 'cancelled';
  const canMarkDelivered = isDeliveryPartner && order.status === 'dispatched';

  const eligiblePartners = (partners ?? []).filter((p) => p.role === 'delivery_partner' && p.storeId === order.storeId);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">Order #{order.id.slice(0, 8)}</h1>
      <p className="text-sm text-slate-500">Store: {order.storeId}</p>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <span className={`rounded-full text-xs px-3 py-1.5 font-medium capitalize ring-1 ${STATUS_COLORS[order.status]}`}>
          {order.status}
        </span>
        {canManageOrders && nextStatus && (
          <button
            onClick={() => setStatus(nextStatus)}
            disabled={updating}
            className={`rounded-full text-white px-4 py-1.5 text-sm font-semibold shadow-sm disabled:opacity-60 capitalize ${STATUS_SOLID_COLORS[nextStatus]}`}
          >
            Mark {nextStatus}
          </button>
        )}
        {canMarkDelivered && (
          <button
            onClick={() => setStatus('delivered')}
            disabled={updating}
            className={`rounded-full text-white px-4 py-1.5 text-sm font-semibold shadow-sm disabled:opacity-60 ${STATUS_SOLID_COLORS.delivered}`}
          >
            Mark delivered
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => setStatus('cancelled')}
            disabled={updating}
            className="rounded-full ring-1 ring-rose-300 text-rose-600 px-4 py-1.5 text-sm font-medium hover:bg-rose-50 disabled:opacity-60"
          >
            Cancel order
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {canManageOrders && (
        <div className="glass mt-6 rounded-xl p-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">Delivery partner</div>
          {delivery ? (
            <div className="text-sm text-slate-900">
              {delivery.partnerName ?? 'Unnamed'}
              {delivery.completedAt && <span className="ml-2 text-xs text-emerald-600 font-medium">Delivered ✓</span>}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Not assigned yet</div>
          )}
          {partners && (
            <select
              defaultValue=""
              onChange={(e) => assignPartner(e.target.value)}
              disabled={updating || eligiblePartners.length === 0}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
            >
              <option value="" disabled>
                {eligiblePartners.length === 0 ? 'No delivery partners at this store' : delivery ? 'Reassign to…' : 'Assign to…'}
              </option>
              {eligiblePartners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.id}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="glass mt-6 divide-y divide-slate-100 rounded-xl">
        {items.map((item) => (
          <div key={item.id} className="p-3 flex justify-between text-sm">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span className="font-medium">₹{item.unitPrice * item.quantity}</span>
          </div>
        ))}
        <div className="p-3 flex justify-between font-semibold text-slate-900">
          <span>Total ({order.paymentMethod.toUpperCase()})</span>
          <span>₹{order.totalAmount}</span>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">History</h2>
        <div className="space-y-1.5">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
              <span
                className={`h-2 w-2 rounded-full ${STATUS_SOLID_COLORS[ev.status as OrderStatus]?.split(' ')[0] ?? 'bg-slate-300'}`}
              />
              {new Date(ev.createdAt).toLocaleString()} — <span className="capitalize font-medium text-slate-700">{ev.status}</span>
            </div>
          ))}
        </div>
      </div>

      {canManageOrders && <p className="mt-6 text-xs text-slate-400">Valid transitions: {ORDER_STATUSES.join(' → ')}</p>}
    </div>
  );
}
