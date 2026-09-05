'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';

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
      <section className="rounded-xl bg-neutral-900 text-white p-8">
        <h1 className="text-2xl font-semibold">Cement, hardware & more — delivered fast.</h1>
        <p className="mt-2 text-neutral-300">Check if we deliver to your pincode.</p>
        <form onSubmit={checkPincode} className="mt-4 flex gap-2 max-w-sm">
          <input
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="Enter pincode"
            className="flex-1 rounded-md px-3 py-2 text-neutral-900"
            inputMode="numeric"
          />
          <button
            type="submit"
            disabled={checking}
            className="rounded-md bg-white text-neutral-900 px-4 py-2 font-medium disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Check'}
          </button>
        </form>
        {result && (
          <p className="mt-3 text-sm">
            {result.serviceable ? (
              <span className="text-emerald-300">We deliver here — ETA ~{result.etaMinutes} min.</span>
            ) : (
              <span className="text-amber-300">Not serviceable at this pincode yet.</span>
            )}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Shop by category</h2>
        {!categories && <p className="text-neutral-500">Loading…</p>}
        {categories && categories.length === 0 && <p className="text-neutral-500">No categories yet.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="rounded-lg border border-neutral-200 bg-white p-5 text-center hover:border-neutral-400 transition-colors"
            >
              <div className="text-3xl">{cat.icon}</div>
              <div className="mt-2 font-medium">{cat.name}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
