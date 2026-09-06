'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/lib/auth';

const LINKS = [
  { href: '/', label: 'Orders' },
  { href: '/categories', label: 'Categories' },
  { href: '/products', label: 'Products' },
  { href: '/inventory', label: 'Inventory' },
];

export function NavBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 bg-gradient-to-r from-amber-700/95 via-amber-600/95 to-yellow-600/95 backdrop-blur-xl shadow-lg shadow-amber-900/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight text-white">
          Matrizo Ops
        </Link>
        {!loading && user && (
          <nav className="flex items-center gap-1 text-sm">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-white text-amber-700'
                    : 'text-amber-50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <span className="ml-3 text-amber-100 text-xs hidden sm:inline">{user.email}</span>
            <button
              onClick={logout}
              className="ml-1 rounded-full px-3 py-1.5 font-medium text-amber-50 hover:bg-white/10 hover:text-white"
            >
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
