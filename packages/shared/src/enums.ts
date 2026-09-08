// Canonical enum value lists — imported by both the D1/Drizzle schema
// (apps/api/src/db/schema.ts) and the zod schemas below, so the two never
// drift apart. Treat these arrays as append-only in production: removing or
// reordering a value changes meaning for rows already written with it.

export const USER_ROLES = ['customer', 'store_staff', 'delivery_partner', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Mirrors the dark-store fulfillment pipeline: placed -> confirmed -> picked
// -> dispatched -> delivered, with cancelled as a terminal side-branch from
// any pre-dispatch state. Each transition here also appends a row to
// order_status_events; `orders.status` is just the denormalized "current"
// pointer for cheap reads.
export const ORDER_STATUSES = ['placed', 'confirmed', 'picked', 'dispatched', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['cod', 'razorpay'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Ledger entry kind for wallet_transactions. `cashback` and `refund` are both
// credits in effect but kept distinct from a plain `credit` (e.g. manual
// adjustment) so the ledger stays legible in the account statement UI.
export const WALLET_TXN_TYPES = ['credit', 'debit', 'cashback', 'refund'] as const;
export type WalletTxnType = (typeof WALLET_TXN_TYPES)[number];

// Manufacturer brand, independent of category (a UPVC fitting and a CPVC
// fitting can both be Prince, say) — lets both apps filter/browse by brand
// as a second axis alongside category. 'others' covers any manufacturer
// without its own dedicated bucket.
export const PRODUCT_BRANDS = ['raksha', 'prince', 'others'] as const;
export type ProductBrand = (typeof PRODUCT_BRANDS)[number];
