'use client';

import Link from 'next/link';

import { useAuth } from '@/lib/auth';

export function NavBar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Matrizo
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/cart" className="hover:underline">
            Cart
          </Link>
          {!loading && user && (
            <>
              <Link href="/orders" className="hover:underline">
                Orders
              </Link>
              <button onClick={logout} className="text-neutral-500 hover:text-neutral-900">
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <Link href="/login" className="hover:underline">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
