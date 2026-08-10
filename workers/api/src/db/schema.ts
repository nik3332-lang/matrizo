import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) =>
  integer(name, { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);

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

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at'),
});

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

export const deliveryPincodes = sqliteTable('delivery_pincodes', {
  pincode: text('pincode').primaryKey(),
  serviceable: integer('serviceable', { mode: 'boolean' }).notNull().default(true),
  etaMinutes: integer('eta_minutes').notNull().default(60),
});

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

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  addressId: text('address_id')
    .notNull()
    .references(() => addresses.id),
  status: text('status', {
    enum: ['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'],
  })
    .notNull()
    .default('placed'),
  paymentMethod: text('payment_method', { enum: ['cod', 'razorpay'] }).notNull(),
  paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'failed'] })
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
