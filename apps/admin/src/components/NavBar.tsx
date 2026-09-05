'use client';

import Link from 'next/link';

import { useAuth } from '@/lib/auth';

export function NavBar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Matrizo Ops
        </Link>
        {!loading && user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">
              Orders
            </Link>
            <Link href="/inventory" className="hover:underline">
              Inventory
            </Link>
            <span className="text-neutral-400">{user.email}</span>
            <button onClick={logout} className="text-neutral-500 hover:text-neutral-900">
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
