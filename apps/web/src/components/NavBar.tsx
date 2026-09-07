'use client';

import Link from 'next/link';

import { useAuth } from '@/lib/auth';

export function NavBar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-amber-700/95 via-amber-600/95 to-yellow-600/95 backdrop-blur-xl shadow-lg shadow-amber-900/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight text-white">
          Matrizo
        </Link>
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
    </header>
  );
}
