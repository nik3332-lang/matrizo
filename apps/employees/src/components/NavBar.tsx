'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/lib/auth';

const ADMIN_LINKS = [{ href: '/admin', label: 'Employees' }];

const EMPLOYEE_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/sales', label: 'Sales entry' },
  { href: '/commission', label: 'Commission' },
  { href: '/profile', label: 'Profile' },
];

export function NavBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  const links = user?.role === 'admin' ? ADMIN_LINKS : EMPLOYEE_LINKS;
  const homeHref = user?.role === 'admin' ? '/admin' : '/';

  return (
    <header className="sticky top-0 z-10 bg-stone-900 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href={homeHref} className="font-bold text-lg tracking-tight text-white">
          Matrizo Employees
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
