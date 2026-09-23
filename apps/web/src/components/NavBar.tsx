"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useLocation } from "@/lib/location";
import { Icon } from "./Icon";
import { Brand } from "./Brand";
import { CategoryBadge } from "./CategoryBadge";
import type { Category } from "@/lib/catalog";
type Suggestion = { id: string; name: string; slug: string };
export function NavBar() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    api
      .get<{ categories: Category[] }>("/categories")
      .then((r) => setCategories(r.categories))
      .catch(() => {});
  }, []);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => {
      if (!q.trim()) {
        setSuggestions([]);
        return;
      }
      api
        .get<{ products: Suggestion[] }>(
          `/products/search?q=${encodeURIComponent(q.trim())}`,
        )
        .then((r) => {
          if (live) setSuggestions(r.products.slice(0, 5));
        })
        .catch(() => {
          if (live) setSuggestions([]);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);
  function search(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    router.push(
      q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/shop",
    );
  }
  function editLocation() {
    setDraft(location.pincode ?? "");
    setEditing((v) => !v);
  }
  async function saveLocation(e: React.FormEvent) {
    e.preventDefault();
    const ok = await location.setPincode(draft);
    if (ok) setEditing(false);
  }
  const deliveryText = location.checking
    ? "Checking delivery…"
    : location.serviceability?.serviceable
      ? `Delivery in ~${location.serviceability.etaMinutes ?? 60} min`
      : location.pincode
        ? "Check delivery availability"
        : "Where should we deliver?";
  return (
    <header className="site-header">
      <div className="announcement">
        Beautiful spaces. Everyday essentials. Delivered by Matrizo.
      </div>
      <div className="header-inner">
        <Brand />
        <button className="delivery-trigger" onClick={editLocation}>
          <Icon name="mapPin" className="h-5 w-5 text-accent" />
          <span>
            <strong>{deliveryText}</strong>
            <small>{location.pincode ?? "Set your delivery pincode"} ⌄</small>
          </span>
        </button>
        <form className="header-search" role="search" onSubmit={search}>
          <Icon name="search" className="h-4 w-4" />
          <input
            aria-label="Search products"
            placeholder="Search for paints, taps, pipes and more"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && q.trim() && suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  onClick={() => setOpen(false)}
                >
                  {p.name} <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          )}
        </form>
        <nav className="header-actions" aria-label="Your account">
          <Link
            href={user ? "/account" : "/login"}
            className="header-account"
            aria-label={user ? "My account" : "Sign in"}
          >
            <Icon name="user" className="h-5 w-5" />
            <span>{user ? "My account" : "Sign in"}</span>
          </Link>
          <Link href="/cart" className="header-cart">
            <Icon name="cart" className="h-4 w-4" />
            Cart{itemCount > 0 && <span>{itemCount}</span>}
          </Link>
        </nav>
      </div>
      <nav className="category-nav" aria-label="Shop categories">
        <Link href="/painters">Painters</Link>
        <Link href="/plumbers">Plumbers</Link>
        <Link href="/shop" className={pathname === "/shop" ? "active" : ""}>
          All products
        </Link>
        <button className="mobile-pincode" onClick={editLocation}>
          <span aria-hidden="true">⌖ </span>
          {location.pincode ?? "Set pincode"}
        </button>
        {categories
          .filter((c) => !c.parentId)
          .map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className={pathname === `/category/${c.slug}` ? "active" : ""}
            >
              {c.colour ? <CategoryBadge category={c} /> : c.name}
            </Link>
          ))}
      </nav>
      {editing && (
        <div className="location-editor">
          <form onSubmit={saveLocation}>
            <input
              aria-label="Delivery pincode"
              placeholder="6-digit pincode"
              value={draft}
              onChange={(e) =>
                setDraft(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
            />
            <button className="button-primary" disabled={location.checking}>
              Check
            </button>
            <button
              type="button"
              className="text-xs px-2"
              onClick={() => setEditing(false)}
            >
              Close
            </button>
          </form>
          {location.error && (
            <p role="alert" className="text-danger">
              {location.error}
            </p>
          )}
          {location.serviceability && !location.serviceability.serviceable && (
            <p>
              We’re not delivering to this pincode yet. You can still explore
              our collection.
            </p>
          )}
        </div>
      )}
    </header>
  );
}
