'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/lib/auth';

export function NavBar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-amber-700/95 via-amber-600/95 to-yellow-600/95 backdrop-blur-xl shadow-lg shadow-amber-900/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight text-white shrink-0">
          Matrizo
        </Link>
        <form onSubmit={submitSearch} className="flex-1 max-w-sm hidden sm:block">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-full px-4 py-1.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-white bg-white/90"
          />
        </form>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/cart" className="rounded-full px-3 py-1.5 font-medium text-amber-50 hover:bg-white/10 hover:text-white transition-colors">
            Cart
          </Link>
          {!loading && user && (
            <>
              <Link href="/orders" className="rounded-full px-3 py-1.5 font-medium text-amber-50 hover:bg-white/10 hover:text-white transition-colors">
                Orders
              </Link>
              <Link href="/account" className="rounded-full px-3 py-1.5 font-medium text-amber-50 hover:bg-white/10 hover:text-white transition-colors">
                Account
              </Link>
              <button
                onClick={logout}
                className="rounded-full px-3 py-1.5 font-medium text-amber-50 hover:bg-white/10 hover:text-white transition-colors"
              >
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/login" className="ml-1 rounded-full bg-white text-amber-700 px-4 py-1.5 font-semibold shadow-sm">
              Log in
            </Link>
          )}
        </nav>
      </div>
      <form onSubmit={submitSearch} className="sm:hidden px-4 pb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-full px-4 py-1.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-white bg-white/90"
        />
      </form>
    </header>
  );
}
