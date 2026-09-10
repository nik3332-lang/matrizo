'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/lib/auth';
import { Icon } from '@/components/Icon';

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
    <header className="sticky top-0 z-10 bg-gradient-to-r from-brand-orange-700/95 via-brand-orange-600/95 to-brand-purple-600/95 backdrop-blur-xl shadow-lg shadow-brand-orange-900/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight text-white shrink-0">
          Matrizo
        </Link>
        <form onSubmit={submitSearch} className="relative flex-1 max-w-sm hidden sm:block">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-full pl-9 pr-4 py-1.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-white bg-white/90"
          />
        </form>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/cart"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-brand-orange-50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Icon name="cart" className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
          </Link>
          {!loading && user && (
            <>
              <Link
                href="/orders"
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-brand-orange-50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon name="receipt" className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-brand-orange-50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon name="user" className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-brand-orange-50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon name="logout" className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/login" className="ml-1 rounded-full bg-white text-brand-orange-700 px-4 py-1.5 font-semibold shadow-sm">
              Log in
            </Link>
          )}
        </nav>
      </div>
      <form onSubmit={submitSearch} className="relative sm:hidden px-4 pb-2">
        <Icon name="search" className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-full pl-9 pr-4 py-1.5 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-white bg-white/90"
        />
      </form>
    </header>
  );
}
