"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatMoney } from "@matrizo/shared";

import { useCart } from "@/lib/cart";
import { Icon } from "./Icon";

// Keep the basket one tap away while browsing the collection.
export function CartBar() {
  const { itemCount, subtotal } = useCart();
  const pathname = usePathname();

  if (
    itemCount === 0 ||
    ["/cart", "/checkout", "/login", "/forgot-password"].includes(pathname) ||
    pathname.startsWith("/orders")
  )
    return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-20 border-t border-line bg-accent text-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Link
        href="/cart"
        className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4"
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          <Icon name="cart" className="h-4 w-4" />
          {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
          {formatMoney(subtotal)}
        </span>
        <span className="font-medium text-sm flex items-center gap-1">
          View cart
          <Icon name="chevronLeft" className="h-3 w-3 rotate-180" />
        </span>
      </Link>
    </div>
  );
}
