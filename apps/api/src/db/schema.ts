import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRODUCT_BRANDS,
  USER_ROLES,
  WALLET_TXN_TYPES,
} from "@matrizo/shared";

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
  integer(name, { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

// --- catalog ---------------------------------------------------------------

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon"),
  colour: text("colour"),
  colourSelection: integer("colour_selection", { mode: "boolean" })
    .notNull()
    .default(false),
  parentId: text("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at"),
});

// Spec attributes vary by category (a paint's finish/coverage has no
// equivalent on a pipe fitting, and vice versa) — one flexible JSON bag
// rather than a column per possible attribute, most of them null on any
// given row. Every field optional and admin-entered; nothing here is
// inferred or defaulted from the product name. Existing rows have no specs
// until an admin fills them in — the web app renders the spec line only
// when present, rather than showing blanks or guessed values.
export type ProductSpecs = {
  // paints
  volumeLitres?: number;
  finish?: "matt" | "satin" | "gloss" | "enamel" | "primer";
  surface?: "interior" | "exterior" | "both";
  coverageSqFtPerLitre?: number;
  // sanitary / plumbing
  size?: string;
  material?: string;
  classOrStandard?: string;
  packQuantity?: number;
};

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  slug: text("slug").notNull().unique(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit").notNull(),
  basePrice: real("base_price").notNull(),
  imageUrl: text("image_url"),
  brand: text("brand", { enum: PRODUCT_BRANDS }).notNull().default("others"),
  specs: text("specs", { mode: "json" }).$type<ProductSpecs>(),
  // Admin-set, defaults false rather than assumed — GST registration
  // status isn't derivable from anything else on the product.
  gstInvoiceEligible: integer("gst_invoice_eligible", { mode: "boolean" })
    .notNull()
    .default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: timestamp("created_at"),
});

export const bulkPricingTiers = sqliteTable("bulk_pricing_tiers", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  minQty: integer("min_qty").notNull(),
  pricePerUnit: real("price_per_unit").notNull(),
});

// --- stores & inventory (the dark-store model) ------------------------------

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  lat: real("lat"),
  lng: real("lng"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: timestamp("created_at"),
});

// Replaces the old global delivery_pincodes table: serviceability is now
// per-store, since "is this pincode serviceable" is really "which store(s)
// serve this pincode, and how fast". A pincode can map to more than one
// store; the API picks the fastest/nearest at order-creation time.
export const storeServicePincodes = sqliteTable(
  "store_service_pincodes",
  {
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    pincode: text("pincode").notNull(),
    etaMinutes: integer("eta_minutes").notNull().default(60),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.pincode] })],
);

export const inventory = sqliteTable(
  "inventory",
  {
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    stockQty: integer("stock_qty").notNull().default(0),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.productId] })],
);

// --- users -------------------------------------------------------------

// One table for every role. Customers use email/mobile plus password, with
// SMS recovery when configured. Staff use separate email/password sign-in. `storeId`
// scopes staff/delivery_partner to the one dark store they work out of
// (null for customers and for admin, who isn't store-scoped).
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    role: text("role", { enum: USER_ROLES }).notNull().default("customer"),
    phone: text("phone"),
    email: text("email"),
    passwordHash: text("password_hash"),
    sessionVersion: integer("session_version").notNull().default(0),
    deletionRequestedAt: integer("deletion_requested_at", {
      mode: "timestamp",
    }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    name: text("name"),
    storeId: text("store_id").references(() => stores.id),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: timestamp("created_at"),
  },
  (t) => [
    uniqueIndex("users_phone_idx").on(t.phone),
    uniqueIndex("users_email_idx").on(t.email),
  ],
);

// Codes are keyed HMACs, never plaintext. One current challenge per destination/purpose.
export const authChallenges = sqliteTable(
  "auth_challenges",
  {
    id: text("id").primaryKey(),
    destination: text("destination").notNull(),
    purpose: text("purpose", {
      enum: ["password_reset", "password_reset_email", "customer_login"],
    }).notNull(),
    userId: text("user_id").references(() => users.id),
    sessionVersion: integer("session_version").notNull().default(0),
    codeHash: text("code_hash").notNull(),
    expiresAt: integer("expires_at").notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: integer("consumed_at"),
    redemptionId: text("redemption_id"),
  },
  (t) => [
    uniqueIndex("auth_challenges_destination_purpose_idx").on(
      t.destination,
      t.purpose,
    ),
  ],
);

export const authRateLimits = sqliteTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const addresses = sqliteTable("addresses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  label: text("label"),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const pushDevices = sqliteTable(
  "push_devices",
  {
    token: text("token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    sessionVersion: integer("session_version").notNull(),
    platform: text("platform", { enum: ["android", "ios"] }).notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("push_devices_user_idx").on(t.userId)],
);

// The order audit trail is the durable source for notification jobs. A unique
// event/device pair prevents duplicate enqueueing by the request and cron paths.
export const pushJobs = sqliteTable(
  "push_jobs",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => orderStatusEvents.id),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    token: text("token")
      .notNull()
      .references(() => pushDevices.token, { onDelete: "cascade" }),
    orderStatus: text("order_status", { enum: ORDER_STATUSES }).notNull(),
    state: text("state", {
      enum: ["pending", "sending", "receipt", "delivered", "failed"],
    })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at").notNull(),
    leaseUntil: integer("lease_until").notNull().default(0),
    ticketId: text("ticket_id"),
    lastError: text("last_error"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("push_jobs_event_token_idx").on(t.eventId, t.token),
    index("push_jobs_due_idx").on(t.nextAttemptAt),
  ],
);

// --- cart ----------------------------------------------------------------

export const cartItems = sqliteTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    shadeId: text("shade_id").notNull().default(""),
    shade: text("shade", { mode: "json" }).$type<ShadeSelection>(),
    createdAt: timestamp("created_at"),
  },
  (t) => [
    uniqueIndex("cart_items_user_product_shade_idx").on(
      t.userId,
      t.productId,
      t.shadeId,
    ),
  ],
);

// --- orders ----------------------------------------------------------------

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    addressId: text("address_id")
      .notNull()
      .references(() => addresses.id),
    // Denormalized "current status" for cheap reads (order list/detail without
    // a join). order_status_events below is the append-only source of truth
    // for the full history; every status change writes there first.
    status: text("status", { enum: ORDER_STATUSES })
      .notNull()
      .default("placed"),
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }).notNull(),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES })
      .notNull()
      .default("pending"),
    totalAmount: real("total_amount").notNull(),
    razorpayOrderId: text("razorpay_order_id"),
    checkoutKey: text("checkout_key"),
    createdAt: timestamp("created_at"),
  },
  (t) => [
    uniqueIndex("orders_user_checkout_key_idx").on(t.userId, t.checkoutKey),
  ],
);

export const orderItems = sqliteTable("order_items", {
  shade: text("shade", { mode: "json" }).$type<ShadeSelection>(),
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
});

export type ShadeSelection = {
  id: string;
  family: string;
  name: string;
  hex: string;
};
export const professionals = sqliteTable("professionals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .unique()
    .references(() => users.id),
  projects: text("projects", { mode: "json" })
    .$type<import("@matrizo/shared").ProfessionalProject[]>()
    .notNull()
    .default([]),
  kind: text("kind", { enum: ["painter", "plumber"] }).notNull(),
  name: text("name").notNull(),
  yearsExperience: integer("years_experience").notNull(),
  photoUrl: text("photo_url").notNull(),
  workPhotos: text("work_photos", { mode: "json" }).$type<string[]>().notNull(),
  updatedBy: text("updated_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  contentType: text("content_type").notNull(),
  data: text("data").notNull(),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at"),
});
export const paintShades = sqliteTable("paint_shades", {
  id: text("id").primaryKey(),
  family: text("family").notNull(),
  name: text("name").notNull(),
  hex: text("hex").notNull(),
  imageUrl: text("image_url"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Append-only audit trail for order tracking. `actorUserId` is null for
// system-driven transitions (e.g. auto-confirm) and set for a human action
// (store staff marking "picked", a delivery partner marking "delivered").
// The OrderTrackerDO reads/writes through this table as the durable log and
// only caches the latest row in memory for fast WebSocket fan-out.
export const orderStatusEvents = sqliteTable("order_status_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  status: text("status", { enum: ORDER_STATUSES }).notNull(),
  actorUserId: text("actor_user_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at"),
});

// One row per delivery assignment. Kept separate from orders (rather than an
// FK column on orders) so a reassignment (partner unavailable, handed off)
// is a new row, not a lossy overwrite.
export const deliveryAssignments = sqliteTable("delivery_assignments", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  deliveryPartnerUserId: text("delivery_partner_user_id")
    .notNull()
    .references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  // R2 object key for the delivery-proof photo, not a URL — keeps bucket/CDN
  // choice swappable without a migration.
  proofPhotoKey: text("proof_photo_key"),
});

// --- sales employees / commission tracking ---------------------------------

// One row per sales_employee user, holding the fields that don't belong on
// the shared `users` table (which every role uses) — same pattern as
// `addresses` being separate from `users`. `commissionRatePercent` is a
// flat percentage of each day's sales amount (e.g. 5 = 5%), set by an admin
// per employee — not slab-based, at least for now.
export const employeeProfiles = sqliteTable("employee_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  phone: text("phone"),
  contactAddress: text("contact_address"),
  commissionRatePercent: real("commission_rate_percent").notNull().default(5),
  joinedAt: timestamp("joined_at"),
});

// Day-wise sales entries a sales_employee logs themselves. `date` is a plain
// 'YYYY-MM-DD' string (not a timestamp) since a sales day has no meaningful
// time-of-day component and this keeps "one entry per employee per day"
// trivial to enforce/query. The unique index is what makes entry "add/update"
// a single upsert rather than needing separate create/edit flows.
export const salesEntries = sqliteTable(
  "sales_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    date: text("date").notNull(),
    amount: real("amount").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (t) => [uniqueIndex("sales_entries_user_date_idx").on(t.userId, t.date)],
);

// --- wallet / cashback ledger ------------------------------------------

// Append-only ledger (never UPDATE a balance in place) so the account
// statement UI and any dispute/audit always has a full, reconstructable
// history. `balanceAfter` is a cached running total written at insert time
// for cheap "current balance" reads without summing the whole table.
export const walletTransactions = sqliteTable("wallet_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type", { enum: WALLET_TXN_TYPES }).notNull(),
  amount: real("amount").notNull(),
  orderId: text("order_id").references(() => orders.id),
  balanceAfter: real("balance_after").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at"),
});
