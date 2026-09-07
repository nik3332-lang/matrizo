'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { categoryColor } from '@/lib/categoryColors';

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

type Serviceability = {
  pincode: string;
  serviceable: boolean;
  etaMinutes: number | null;
};

export default function HomePage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Serviceability | null>(null);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then((res) => setCategories(res.categories));
  }, []);

  async function checkPincode(e: React.FormEvent) {
    e.preventDefault();
    if (!pincode.trim()) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await api.get<Serviceability>(`/serviceability/${encodeURIComponent(pincode.trim())}`);
      setResult(res);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-amber-700 via-amber-600 to-yellow-600 text-white p-8 shadow-lg shadow-amber-900/20">
        <h1 className="text-2xl font-bold">Cement, hardware & more — delivered fast.</h1>
        <p className="mt-2 text-amber-50">Check if we deliver to your pincode.</p>
        <form onSubmit={checkPincode} className="mt-4 flex gap-2 max-w-sm">
          <input
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="Enter pincode"
            className="flex-1 rounded-lg px-3 py-2 text-stone-900 outline-none focus:ring-2 focus:ring-white"
            inputMode="numeric"
          />
          <button
            type="submit"
            disabled={checking}
            className="rounded-lg bg-white text-amber-700 px-4 py-2 font-semibold shadow-sm disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Check'}
          </button>
        </form>
        {result && (
          <p className="mt-3 text-sm">
            {result.serviceable ? (
              <span className="text-emerald-100 font-medium">✓ We deliver here — ETA ~{result.etaMinutes} min.</span>
            ) : (
              <span className="text-amber-100 font-medium">Not serviceable at this pincode yet.</span>
            )}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Shop by category</h2>
        {!categories && <p className="text-stone-500">Loading…</p>}
        {categories && categories.length === 0 && <p className="text-stone-500">No categories yet.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories?.map((cat) => {
            const color = categoryColor(cat.id);
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="glass rounded-xl p-5 text-center hover:-translate-y-0.5 hover:shadow-lg transition-all"
              >
                <div
                  className={`mx-auto h-14 w-14 rounded-full bg-gradient-to-br ${color.accent} flex items-center justify-center text-3xl shadow-md`}
                >
                  {cat.icon}
                </div>
                <div className="mt-3 font-semibold text-stone-900">{cat.name}</div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
