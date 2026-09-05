import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  USER_ROLES,
  WALLET_TXN_TYPES,
} from '@matrizo/shared';

// --- conventions kept from the pre-rewrite schema, deliberately, for a clean
// path to Postgres later if this ever outgrows D1: -----------------------
//  - primary keys are app-generated text ids (ULID/UUID), never SQLite rowid
//    autoincrement — Postgres has no equivalent semantics for the latter.
//  - timestamps are integers (unix epoch seconds via `mode: 'timestamp'`),
//    which maps cleanly onto a Postgres `timestamptz` behind a small
//    translation layer, rather than SQLite's ad-hoc text-datetime functions.
//  - enums are plain `text` with a TS-level union (via `{ enum: [...] }`),
//    which Postgres represents either as a native enum or a check constraint
//    — no SQLite-only json_extract()/pragma tricks live in app code.
const timestamp = (name: string) =>
  integer(name, { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);

// --- catalog ---------------------------------------------------------------

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  icon: text('icon'),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at'),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  slug: text('slug').notNull().unique(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  unit: text('unit').notNull(),
  basePrice: real('base_price').notNull(),
  imageUrl: text('image_url'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: timestamp('created_at'),
});

export const bulkPricingTiers = sqliteTable('bulk_pricing_tiers', {
  id: text('id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  minQty: integer('min_qty').notNull(),
  pricePerUnit: real('price_per_unit').notNull(),
});

// --- stores & inventory (the dark-store model) ------------------------------

export const stores = sqliteTable('stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  line1: text('line1').notNull(),
  line2: text('line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: timestamp('created_at'),
});

// Replaces the old global delivery_pincodes table: serviceability is now
// per-store, since "is this pincode serviceable" is really "which store(s)
// serve this pincode, and how fast". A pincode can map to more than one
// store; the API picks the fastest/nearest at order-creation time.
export const storeServicePincodes = sqliteTable(
  'store_service_pincodes',
  {
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id),
    pincode: text('pincode').notNull(),
    etaMinutes: integer('eta_minutes').notNull().default(60),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.pincode] })]
);

export const inventory = sqliteTable(
  'inventory',
  {
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    stockQty: integer('stock_qty').notNull().default(0),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.productId] })]
);

// --- users -------------------------------------------------------------

// One table for every role. Customers authenticate via phone OTP and always
// have `phone` set; store_staff/delivery_partner/admin authenticate via
// email+password and always have `email` + `passwordHash` set. `storeId`
// scopes staff/delivery_partner to the one dark store they work out of
// (null for customers and for admin, who isn't store-scoped).
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    role: text('role', { enum: USER_ROLES }).notNull().default('customer'),
    phone: text('phone'),
    email: text('email'),
    passwordHash: text('password_hash'),
    name: text('name'),
    storeId: text('store_id').references(() => stores.id),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: timestamp('created_at'),
  },
  (t) => [
    uniqueIndex('users_phone_idx').on(t.phone),
    uniqueIndex('users_email_idx').on(t.email),
  ]
);

export const addresses = sqliteTable('addresses', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  label: text('label'),
  line1: text('line1').notNull(),
  line2: text('line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
});

// --- cart ----------------------------------------------------------------

export const cartItems = sqliteTable(
  'cart_items',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at'),
  },
  (t) => [uniqueIndex('cart_items_user_product_idx').on(t.userId, t.productId)]
);

// --- orders ----------------------------------------------------------------

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id),
  addressId: text('address_id')
    .notNull()
    .references(() => addresses.id),
  // Denormalized "current status" for cheap reads (order list/detail without
  // a join). order_status_events below is the append-only source of truth
  // for the full history; every status change writes there first.
  status: text('status', { enum: ORDER_STATUSES }).notNull().default('placed'),
  paymentMethod: text('payment_method', { enum: PAYMENT_METHODS }).notNull(),
  paymentStatus: text('payment_status', { enum: PAYMENT_STATUSES })
    .notNull()
    .default('pending'),
  totalAmount: real('total_amount').notNull(),
  razorpayOrderId: text('razorpay_order_id'),
  createdAt: timestamp('created_at'),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id),
  productId: text('product_id')
    .notNull()
    .references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
});

// Append-only audit trail for order tracking. `actorUserId` is null for
// system-driven transitions (e.g. auto-confirm) and set for a human action
// (store staff marking "picked", a delivery partner marking "delivered").
// The OrderTrackerDO reads/writes through this table as the durable log and
// only caches the latest row in memory for fast WebSocket fan-out.
export const orderStatusEvents = sqliteTable('order_status_events', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id),
  status: text('status', { enum: ORDER_STATUSES }).notNull(),
  actorUserId: text('actor_user_id').references(() => users.id),
  note: text('note'),
  createdAt: timestamp('created_at'),
});

// One row per delivery assignment. Kept separate from orders (rather than an
// FK column on orders) so a reassignment (partner unavailable, handed off)
// is a new row, not a lossy overwrite.
export const deliveryAssignments = sqliteTable('delivery_assignments', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id),
  deliveryPartnerUserId: text('delivery_partner_user_id')
    .notNull()
    .references(() => users.id),
  assignedAt: timestamp('assigned_at'),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  // R2 object key for the delivery-proof photo, not a URL — keeps bucket/CDN
  // choice swappable without a migration.
  proofPhotoKey: text('proof_photo_key'),
});

// --- wallet / cashback ledger ------------------------------------------

// Append-only ledger (never UPDATE a balance in place) so the account
// statement UI and any dispute/audit always has a full, reconstructable
// history. `balanceAfter` is a cached running total written at insert time
// for cheap "current balance" reads without summing the whole table.
export const walletTransactions = sqliteTable('wallet_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type', { enum: WALLET_TXN_TYPES }).notNull(),
  amount: real('amount').notNull(),
  orderId: text('order_id').references(() => orders.id),
  balanceAfter: real('balance_after').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at'),
});
