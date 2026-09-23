"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, formatMoney } from "@matrizo/shared";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useLocation } from "@/lib/location";
import { api } from "@/lib/api";
import { specLine, type ProductSpecs } from "@/lib/specs";
import { Icon, type IconName } from "./Icon";
import { CategoryBadge } from "./CategoryBadge";
type Tier = { minQty: number; pricePerUnit: number };
export type ProductCardData = {
  category?: {
    name: string;
    colour?: string | null;
    colourSelection?: boolean;
  } | null;
  id: string;
  slug: string;
  name: string;
  unit: string;
  imageUrl?: string | null;
};
export function ProductCard({
  product,
  price,
  tiers = [],
  categoryIconName,
  imageSrc,
  brandLabel,
  specs,
  gstInvoiceEligible,
}: {
  product: ProductCardData;
  price: number;
  tiers?: Tier[];
  categoryIconName: IconName;
  imageSrc?: string | null;
  brandLabel?: string;
  specs?: ProductSpecs | null;
  gstInvoiceEligible?: boolean;
}) {
  const { user } = useAuth();
  const cart = useCart();
  const router = useRouter();
  const { pincode } = useLocation();
  const [availability, setAvailability] = useState<{
    pincode: string;
    available: boolean;
  } | null>(null);
  const unavailable =
    !!pincode && availability?.pincode === pincode && !availability.available;
  useEffect(() => {
    if (!pincode) return;
    let live = true;
    api
      .get<{ stock: { available: boolean } | null }>(
        `/products/${encodeURIComponent(product.slug)}/stock?pincode=${encodeURIComponent(pincode)}`,
      )
      .then(({ stock }) => {
        if (live) setAvailability({ pincode, available: !!stock?.available });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pincode, product.slug]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const quantity = cart.quantityOf(product.id);
  const bestTier = [...tiers].sort(
    (a, b) => a.pricePerUnit - b.pricePerUnit,
  )[0];
  const picture = product.imageUrl || imageSrc;
  const spec = specLine(specs);
  async function update(next: number) {
    if (product.category?.colourSelection) {
      router.push(`/product/${product.slug}`);
      return;
    }
    if (!user) {
      router.push(
        `/login?next=${encodeURIComponent(`/product/${product.slug}`)}`,
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (quantity === 0) await cart.addItem(product.id);
      else await cart.setQuantity(product.id, next);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not update your cart.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="product-card">
      <Link
        href={`/product/${product.slug}`}
        className="product-art"
        aria-label={product.name}
      >
        {picture ? (
          <Image
            src={picture}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 240px"
            className="object-contain p-5"
          />
        ) : (
          <Icon name={categoryIconName} className="h-12 w-12 text-accent" />
        )}
        {bestTier && bestTier.pricePerUnit < price && (
          <span className="product-tag">Bulk savings</span>
        )}
      </Link>
      <div className="product-card-body">
        {unavailable && <p className="text-sm text-danger">Unavailable</p>}
        <CategoryBadge category={product.category} />
        <span className="product-brand">
          {brandLabel ?? "Matrizo collection"}
        </span>
        <Link href={`/product/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        <p className="product-unit">
          {spec || `Per ${product.unit}`}
          {gstInvoiceEligible && " · GST invoice"}
        </p>
        <div className="product-purchase">
          <div>
            <strong>{formatMoney(price)}</strong>
            {bestTier && (
              <small>From {formatMoney(bestTier.pricePerUnit)} in bulk</small>
            )}
          </div>
          {product.category?.colourSelection ? (
            <Link
              href={`/product/${product.slug}`}
              className="quick-add"
              style={{ whiteSpace: "normal", maxWidth: 90 }}
            >
              Choose colour
            </Link>
          ) : !quantity ? (
            <button
              aria-label={`Add ${product.name} to cart`}
              disabled={busy || unavailable}
              onClick={() => update(1)}
              className="quick-add"
            >
              {busy ? "…" : "ADD"} <span aria-hidden="true">+</span>
            </button>
          ) : (
            <div className="quantity-control">
              <button
                disabled={busy}
                onClick={() => update(quantity - 1)}
                aria-label={`Decrease ${product.name} quantity`}
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                disabled={busy || unavailable}
                onClick={() => update(quantity + 1)}
                aria-label={`Increase ${product.name} quantity`}
              >
                +
              </button>
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger mt-2">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
