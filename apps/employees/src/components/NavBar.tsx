"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
function Brand() {
  return (
    <Link href="/" className="portal-brand">
      <span aria-hidden="true">M</span>matrizo.
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
      ? [["/admin", "Employees"]]
      : [
          ["/", "Overview"],
          ["/sales", "Log daily sales"],
          ["/commission", "Commission"],
          ["/profile", "My profile"],
        ];
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
        <p className="portal-sidebar-label">YOUR TEAM WORKSPACE</p>
        <nav className="portal-links" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={path === href ? "active" : ""}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M8 9h8M8 13h8M8 17h4" />
              </svg>
              {label}
            </Link>
          ))}
        </nav>
        <div className="portal-sidebar-bottom">
          <strong>{user?.name ?? "Matrizo team"}</strong>
          <small>{user?.email ?? "Sign in to your workspace"}</small>
          <a href="https://www.matrizo.com">Open storefront ↗</a>
          {user?.role === "admin" && (
            <a href="https://matrizo-admin.nikhilsinghal-official.workers.dev/sales">
              Review daily sales ↗
            </a>
          )}
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
