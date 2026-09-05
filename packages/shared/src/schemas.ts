import { z } from 'zod';

import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  USER_ROLES,
  WALLET_TXN_TYPES,
} from './enums';

export const userSchema = z.object({
  id: z.string(),
  role: z.enum(USER_ROLES),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  storeId: z.string().nullable(),
  active: z.boolean(),
});

export const addressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  label: z.string().nullable(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  isDefault: z.boolean(),
});

export const categorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  parentId: z.string().nullable(),
  sortOrder: z.number(),
});

export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  slug: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  unit: z.string(),
  basePrice: z.number(),
  imageUrl: z.string().nullable(),
  active: z.boolean(),
});

export const bulkPricingTierSchema = z.object({
  id: z.string(),
  productId: z.string(),
  minQty: z.number(),
  pricePerUnit: z.number(),
});

export const storeSchema = z.object({
  id: z.string(),
  name: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  active: z.boolean(),
});

export const storeServicePincodeSchema = z.object({
  storeId: z.string(),
  pincode: z.string(),
  etaMinutes: z.number(),
});

// Result of a serviceability check for a given pincode: the store that will
// fulfil the order (nearest/fastest of possibly several serving that
// pincode), or null when nothing serves it yet.
export const serviceabilitySchema = z.object({
  pincode: z.string(),
  serviceable: z.boolean(),
  storeId: z.string().nullable(),
  etaMinutes: z.number().nullable(),
});

export const inventorySchema = z.object({
  storeId: z.string(),
  productId: z.string(),
  stockQty: z.number(),
});

export const cartItemSchema = z.object({
  id: z.string(),
  product: productSchema,
  quantity: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  subtotal: z.number(),
});

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  storeId: z.string(),
  addressId: z.string(),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  totalAmount: z.number(),
  razorpayOrderId: z.string().nullable(),
  createdAt: z.number(),
});

export const orderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export const orderStatusEventSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  status: z.enum(ORDER_STATUSES),
  actorUserId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.number(),
});

export const deliveryAssignmentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  deliveryPartnerUserId: z.string(),
  assignedAt: z.number(),
  completedAt: z.number().nullable(),
  proofPhotoKey: z.string().nullable(),
});

export const walletTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(WALLET_TXN_TYPES),
  amount: z.number(),
  orderId: z.string().nullable(),
  balanceAfter: z.number(),
  note: z.string().nullable(),
  createdAt: z.number(),
});
