'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Commission = {
  commissionRatePercent: number;
  totalSales: number;
  totalCommission: number;
  currentMonth: string;
  monthSales: number;
  monthCommission: number;
};
type SalesEntry = { id: string; date: string; amount: number; notes: string | null };

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function CommissionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [commission, setCommission] = useState<Commission | null>(null);
  const [month, setMonth] = useState(thisMonth());
  const [entries, setEntries] = useState<SalesEntry[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'sales_employee') {
      router.replace('/admin');
      return;
    }
    api.get<{ commission: Commission }>('/employees/me').then((res) => setCommission(res.commission));
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'sales_employee') return;
    setEntries(null);
    api.get<{ entries: SalesEntry[] }>(`/employees/me/sales?month=${month}`).then((res) => setEntries(res.entries));
  }, [month, user]);

  if (!commission) return <p className="text-stone-500">Loading…</p>;

  const rate = commission.commissionRatePercent;
  const monthTotalSales = entries?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const monthTotalCommission = Math.round(monthTotalSales * (rate / 100) * 100) / 100;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-stone-900">Commission tracker</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-brand-purple-800">{rate}%</div>
          <div className="text-xs text-stone-500 mt-1">Your rate</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-stone-900">₹{commission.totalSales.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">Total sales (all time)</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-brand-orange-700">₹{commission.totalCommission.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">Total commission earned</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-900">Month breakdown</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>

        <div className="glass rounded-xl p-4 flex items-center justify-between mb-3">
          <span className="text-stone-600 font-medium">
            {month} — {entries?.length ?? 0} day(s) logged
          </span>
          <div className="text-right">
            <div className="font-bold text-brand-orange-700">₹{monthTotalCommission.toFixed(2)} commission</div>
            <div className="text-xs text-stone-500">on ₹{monthTotalSales.toFixed(2)} sales</div>
          </div>
        </div>

        {!entries && <p className="text-stone-500">Loading…</p>}
        {entries && entries.length === 0 && <p className="text-stone-500">No sales logged for this month.</p>}
        <div className="glass rounded-xl divide-y divide-stone-100">
          {entries?.map((entry) => (
            <div key={entry.id} className="p-3 flex items-center justify-between text-sm">
              <span className="text-stone-700">{entry.date}</span>
              <span className="text-stone-500">₹{entry.amount.toFixed(2)} sales</span>
              <span className="font-medium text-brand-orange-700">₹{(Math.round(entry.amount * (rate / 100) * 100) / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
