'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/lib/auth';
import { useLocation } from '@/lib/location';
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
    <header className="sticky top-0 z-10 bg-surface border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-medium text-lg tracking-tight text-stone-900 shrink-0">
          Matrizo
        </Link>
        <form onSubmit={submitSearch} className="relative flex-1 max-w-sm hidden sm:block">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="w-full h-11 rounded-full pl-9 pr-4 text-sm text-stone-900 outline-none border border-line bg-white"
          />
        </form>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/cart"
            className="flex items-center gap-1.5 min-h-11 rounded-card px-3 font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <Icon name="cart" className="h-4 w-4" />
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
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full h-11 rounded-full pl-9 pr-4 text-sm text-stone-900 outline-none border border-line bg-white"
        />
      </form>
      <LocationBar />
    </header>
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
