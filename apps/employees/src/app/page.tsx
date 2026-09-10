'use client';

import Link from 'next/link';
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
type Employee = { id: string; email: string | null; name: string | null; phone: string | null; contactAddress: string | null; joinedAt: string };

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<{ employee: Employee; commission: Commission } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'admin') {
      router.replace('/admin');
      return;
    }
    api.get<{ employee: Employee; commission: Commission }>('/employees/me').then(setData);
  }, [loading, user, router]);

  if (!data) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Welcome, {data.employee.name}</h1>
        <p className="text-sm text-stone-500 mt-1">Here&apos;s how this month is going.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-stone-900">₹{data.commission.monthSales.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">Sales this month</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-brand-orange-700">₹{data.commission.monthCommission.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">Commission this month</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-stone-900">₹{data.commission.totalSales.toFixed(2)}</div>
          <div className="text-xs text-stone-500 mt-1">Total sales (all time)</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-2xl font-bold text-brand-purple-800">{data.commission.commissionRatePercent}%</div>
          <div className="text-xs text-stone-500 mt-1">Your commission rate</div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/sales" className="rounded-lg bg-brand-orange-700 text-white px-4 py-2.5 font-semibold shadow-sm hover:bg-brand-orange-800">
          Log today&apos;s sales
        </Link>
        <Link href="/commission" className="rounded-lg px-4 py-2.5 font-medium text-stone-700 border border-stone-300 hover:bg-stone-50">
          View commission history
        </Link>
      </div>
    </div>
  );
}
