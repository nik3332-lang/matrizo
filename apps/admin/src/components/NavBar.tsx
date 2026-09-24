"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
const ADMIN_LINKS = [
  ["/", "Orders"],
  ["/products", "Products"],
  ["/categories", "Categories"],
  ["/shades", "Paint colours"],
  ["/inventory", "Inventory"],
  ["/delivery-areas", "Delivery areas"],
  ["/employees", "Employees"],
  ["/professionals", "Painters & Plumbers"],
  ["/sales", "Daily sales"],
  ["/staff", "Store staff"],
  ["/analytics", "Analytics"],
];
function Brand() {
  return (
    <Link href="/" className="portal-brand">
      <Image src="/matrizo-logo.jpeg" alt="" width={64} height={48} />
      Matrizo
    </Link>
  );
}
export function NavBar() {
  const { user, logout } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (path === "/login")
    return (
      <header className="portal-login-header">
        <Brand />
      </header>
    );
  const links =
    user?.role === "admin"
      ? ADMIN_LINKS
      : user?.role === "store_staff"
        ? [
            ["/", "Orders"],
            ["/inventory", "Inventory"],
          ]
        : [["/", "My deliveries"]];
  return (
    <>
      <header className="portal-mobile">
        <Brand />
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          ☰ Menu
        </button>
      </header>
      <aside className={`portal-sidebar ${open ? "is-open" : ""}`}>
        <Brand />
        <p className="portal-sidebar-label">OPERATIONS WORKSPACE</p>
        <nav className="portal-links" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={
                path === href || (href !== "/" && path.startsWith(href + "/"))
                  ? "active"
                  : ""
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="6" height="6" rx="1" />
                <rect x="14" y="4" width="6" height="6" rx="1" />
                <rect x="4" y="14" width="6" height="6" rx="1" />
                <rect x="14" y="14" width="6" height="6" rx="1" />
              </svg>
              {label}
            </Link>
          ))}
        </nav>
        <div className="portal-sidebar-bottom">
          <strong>{user?.name ?? "Matrizo team"}</strong>
          <small>{user?.email ?? "Sign in to your workspace"}</small>
          <a href="https://www.matrizo.com">Open storefront ↗</a>
          {user ? (
            <button onClick={logout}>Sign out</button>
          ) : (
            <Link href="/login">Sign in →</Link>
          )}
        </div>
      </aside>
    </>
  );
}
