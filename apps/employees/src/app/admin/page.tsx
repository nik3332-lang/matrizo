'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type EmployeeRow = {
  id: string;
  email: string | null;
  name: string | null;
  active: boolean;
  phone: string | null;
  commission: { commissionRatePercent: number; totalSales: number; totalCommission: number; monthSales: number; monthCommission: number };
};

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRow[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/');
      return;
    }
    api.get<{ employees: EmployeeRow[] }>('/admin/employees').then((res) => setEmployees(res.employees));
  }, [authLoading, user, router]);

  if (!employees) return <p className="text-stone-500">Loading…</p>;

  const totalMonthCommission = employees.reduce((sum, e) => sum + e.commission.monthCommission, 0);
  const totalMonthSales = employees.reduce((sum, e) => sum + e.commission.monthSales, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-stone-900">Sales employees</h1>
        <Link href="/admin/new" className="rounded-full bg-brand-orange-700 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-brand-orange-800">
          + Add employee
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 border-l-4 border-l-stone-400">
          <div className="text-2xl font-bold text-stone-700">{employees.length}</div>
          <div className="text-xs text-stone-500">Employees</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-brand-purple-800">
          <div className="text-2xl font-bold text-brand-purple-800">₹{totalMonthSales.toFixed(2)}</div>
          <div className="text-xs text-stone-500">Team sales this month</div>
        </div>
        <div className="glass rounded-xl p-4 border-l-4 border-l-brand-orange-700">
          <div className="text-2xl font-bold text-brand-orange-700">₹{totalMonthCommission.toFixed(2)}</div>
          <div className="text-xs text-stone-500">Team commission this month</div>
        </div>
      </div>

      <div className="space-y-2">
        {employees.map((emp) => (
          <Link
            key={emp.id}
            href={`/admin/${emp.id}`}
            className="glass block rounded-xl p-4 flex items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-900">{emp.name}</span>
                {!emp.active && <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 font-medium">Inactive</span>}
              </div>
              <div className="text-sm text-stone-500 mt-0.5">
                {emp.email} {emp.phone ? `· ${emp.phone}` : ''} · {emp.commission.commissionRatePercent}% commission
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold text-brand-orange-700">₹{emp.commission.monthCommission.toFixed(2)}</div>
              <div className="text-xs text-stone-500">this month</div>
            </div>
          </Link>
        ))}
        {employees.length === 0 && <p className="text-stone-500">No sales employees yet.</p>}
      </div>
    </div>
  );
}
