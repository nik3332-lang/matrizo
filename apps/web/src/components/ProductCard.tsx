'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { specLine, type ProductSpecs } from '@/lib/specs';
import { Icon, type IconName } from './Icon';

type Tier = { minQty: number; pricePerUnit: number };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  unit: string;
};

// The shared product tile — home, category, brand, and search each used to
// reimplement this independently (four copies of the same card drifting
// slightly apart). One component now, built on the STAGE 2 tokens: white
// surface, hairline border, one card radius, one accent color reserved for
// the price/bulk-tier line, two font weights, quiet hover (no lift/shadow).
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
  /** Generic category artwork or a real product image, when available. */
  imageSrc?: string | null;
  /** Optional manufacturer brand (Raksha/Prince/Others) — a plain neutral
   * badge, not a colored one. Brand used to get its own hue per value,
   * which was decoration outside the one-accent rule; the name alone
   * still reads fine as an outlined chip. */
  brandLabel?: string;
  specs?: ProductSpecs | null;
  gstInvoiceEligible?: boolean;
}) {
  const bestTier = [...tiers].sort((a, b) => b.minQty - a.minQty)[0];
  const spec = specLine(specs);
  const { user } = useAuth();
  const { quantityOf, addItem, setQuantity } = useCart();
  const router = useRouter();
  const quantity = quantityOf(product.id);

  /** Every quick-add control sits inside the card's <Link> and needs to
   * both stop navigation and, for a signed-out visitor, redirect to /login
   * instead of hitting the cart API (which requires auth). Returns whether
   * the caller should go ahead with its cart mutation. */
  function guard(e: React.MouseEvent): boolean {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return false;
    }
    return true;
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className="block rounded-card border border-line bg-surface overflow-hidden transition-colors hover:border-stone-300"
    >
      <div className="relative h-32 bg-white flex items-center justify-center">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-contain p-3"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-accent-subtle flex items-center justify-center">
            <Icon name={categoryIconName} className="h-7 w-7 text-accent" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-medium text-stone-900 line-clamp-2">{product.name}</div>
        <div className="mt-1 flex items-center gap-1 flex-wrap">
          {brandLabel && (
            <span className="text-[11px] px-2 py-0.5 rounded-card border border-line text-stone-600">{brandLabel}</span>
          )}
          {gstInvoiceEligible && (
            <span className="text-[11px] px-2 py-0.5 rounded-card border border-line text-stone-600">GST invoice</span>
          )}
        </div>
        {/* Dense spec line, before price — only when real specs exist. */}
        {spec && <div className="mt-1 text-xs text-stone-500">{spec}</div>}
        <div className="mt-1 text-sm text-stone-500">per {product.unit}</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-medium text-accent">₹{price}</span>
          {quantity === 0 ? (
            <button
              onClick={(e) => guard(e) && addItem(product.id)}
              className="min-h-9 min-w-16 rounded-card border border-accent text-accent text-sm font-medium px-3 hover:bg-accent-subtle"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-card bg-accent text-white h-9">
              <button
                onClick={(e) => guard(e) && setQuantity(product.id, quantity - 1)}
                className="h-9 w-8 flex items-center justify-center"
                aria-label="Decrease quantity"
              >
                <Icon name="minus" className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-medium min-w-4 text-center">{quantity}</span>
              <button
                onClick={(e) => guard(e) && addItem(product.id)}
                className="h-9 w-8 flex items-center justify-center"
                aria-label="Increase quantity"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        {bestTier && (
          <div className="mt-1 text-xs text-stone-500">
            {bestTier.minQty} or more: <span className="font-medium text-accent">₹{bestTier.pricePerUnit}</span> each
          </div>
        )}
      </div>
    </Link>
  );
}
