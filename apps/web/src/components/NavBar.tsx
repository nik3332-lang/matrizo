'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { useLocation } from '@/lib/location';
import { Icon } from '@/components/Icon';

type Suggestion = { id: string; slug: string; name: string };

// Debounced live results under the search input — Blinkit-style instant
// search rather than only-on-submit. Submitting (Enter, or the search icon
// on mobile) still goes to the full /search results page unchanged.
function useSearchSuggestions() {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(() => {
      api
        .get<{ products: Suggestion[] }>(`/products/search?q=${encodeURIComponent(query)}`)
        .then((res) => setSuggestions(res.products.slice(0, 5)))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  return { q, setQ, suggestions, open, setOpen };
}

export function NavBar() {
  const { user, loading, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchSuggestions();

  useEffect(() => {
    search.setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.q.trim()) return;
    search.setOpen(false);
    router.push(`/search?q=${encodeURIComponent(search.q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-10 bg-surface border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-medium text-lg tracking-tight text-stone-900 shrink-0">
          Matrizo
        </Link>
        <form onSubmit={submitSearch} className="relative flex-1 max-w-sm hidden sm:block">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            value={search.q}
            onChange={(e) => search.setQ(e.target.value)}
            onFocus={() => search.setOpen(true)}
            onBlur={() => setTimeout(() => search.setOpen(false), 150)}
            onKeyDown={(e) => e.key === 'Escape' && search.setOpen(false)}
            placeholder="Search products…"
            className="w-full h-11 rounded-full pl-9 pr-4 text-sm text-stone-900 outline-none border border-line bg-white"
          />
          {search.open && search.suggestions.length > 0 && <SuggestionDropdown suggestions={search.suggestions} />}
        </form>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 min-h-11 rounded-card px-3 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <span className="relative">
              <Icon name="cart" className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 h-4 min-w-4 px-0.5 rounded-full bg-accent text-white text-[10px] font-medium flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">Cart</span>
          </Link>
          {!loading && user && (
            <>
              <Link
                href="/orders"
                className="flex items-center gap-1.5 min-h-11 rounded-card px-3 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                <Icon name="receipt" className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-1.5 min-h-11 rounded-card px-3 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                <Icon name="user" className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 min-h-11 rounded-card px-3 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                <Icon name="logout" className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              className="ml-1 flex items-center min-h-11 rounded-card bg-accent text-white px-4 font-medium hover:bg-accent-hover"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
      <form onSubmit={submitSearch} className="relative sm:hidden px-4 pb-2">
        <Icon name="search" className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          value={search.q}
          onChange={(e) => search.setQ(e.target.value)}
          onFocus={() => search.setOpen(true)}
          onBlur={() => setTimeout(() => search.setOpen(false), 150)}
          onKeyDown={(e) => e.key === 'Escape' && search.setOpen(false)}
          placeholder="Search products…"
          className="w-full h-11 rounded-full pl-9 pr-4 text-sm text-stone-900 outline-none border border-line bg-white"
        />
        {search.open && search.suggestions.length > 0 && <SuggestionDropdown suggestions={search.suggestions} className="left-4 right-4" />}
      </form>
      <LocationBar />
    </header>
  );
}

function SuggestionDropdown({ suggestions, className = '' }: { suggestions: Suggestion[]; className?: string }) {
  return (
    <div className={`absolute top-full mt-1 inset-x-0 rounded-card border border-line bg-white shadow-sm overflow-hidden z-20 ${className}`}>
      {suggestions.map((product) => (
        <Link
          key={product.id}
          href={`/product/${product.slug}`}
          className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 truncate"
        >
          {product.name}
        </Link>
      ))}
    </div>
  );
}

// STAGE 3: the pincode-check hero is gone — this is where "do you deliver
// to me, and how fast" lives now, persistent and editable on every route
// instead of a one-off homepage form.
function LocationBar() {
  const { pincode, serviceability, checking, setPincode } = useLocation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await setPincode(draft.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={submit} className="border-t border-line px-4 py-2 flex items-center gap-2 max-w-5xl mx-auto">
        <Icon name="mapPin" className="h-4 w-4 text-stone-400 shrink-0" />
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Enter delivery pincode"
          inputMode="numeric"
          className="flex-1 h-9 rounded-card border border-line px-3 text-sm outline-none"
        />
        <button type="submit" disabled={checking} className="h-9 rounded-card bg-accent text-white px-3 text-sm font-medium disabled:opacity-60">
          {checking ? 'Checking…' : 'Check'}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="h-9 px-2 text-sm font-medium text-stone-500">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(pincode ?? '');
        setEditing(true);
      }}
      className="w-full border-t border-line px-4 py-2 flex items-center gap-1.5 text-sm text-stone-600 hover:bg-stone-50 max-w-5xl mx-auto"
    >
      <Icon name="mapPin" className="h-4 w-4 text-stone-400 shrink-0" />
      {!pincode && <span className="font-medium">Set delivery location</span>}
      {pincode && checking && <span>Checking {pincode}…</span>}
      {pincode && !checking && serviceability?.serviceable && (
        <span>
          Delivering to <span className="font-medium text-stone-900">{pincode}</span>
          {serviceability.etaMinutes != null && <span className="text-success font-medium"> · ETA ~{serviceability.etaMinutes} min</span>}
        </span>
      )}
      {pincode && !checking && serviceability && !serviceability.serviceable && (
        <span>
          <span className="font-medium text-stone-900">{pincode}</span> — not serviceable yet
        </span>
      )}
      <Icon name="chevronLeft" className="h-3 w-3 -rotate-90 text-stone-400 ml-auto shrink-0" />
    </button>
  );
}
