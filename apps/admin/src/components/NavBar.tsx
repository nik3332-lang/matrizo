'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/lib/auth';

const ADMIN_LINKS = [
  { href: '/', label: 'Orders' },
  { href: '/categories', label: 'Categories' },
  { href: '/products', label: 'Products' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/staff', label: 'Staff' },
  { href: '/analytics', label: 'Analytics' },
];

const STORE_STAFF_LINKS = [
  { href: '/', label: 'Orders' },
  { href: '/inventory', label: 'Inventory' },
];

const DELIVERY_PARTNER_LINKS = [{ href: '/', label: 'My deliveries' }];

export function NavBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  const links =
    user?.role === 'admin' ? ADMIN_LINKS : user?.role === 'store_staff' ? STORE_STAFF_LINKS : DELIVERY_PARTNER_LINKS;

  return (
    <header className="sticky top-0 z-10 bg-stone-900 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight text-white">
          Matrizo Ops
        </Link>
        {!loading && user && (
          <nav className="flex items-center gap-1 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  pathname === link.href ? 'bg-brand-orange-700 text-white' : 'text-stone-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <span className="ml-3 text-stone-400 text-xs hidden sm:inline">{user.email}</span>
            <button onClick={logout} className="ml-1 rounded-full px-3 py-1.5 font-medium text-stone-300 hover:bg-white/10 hover:text-white">
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
