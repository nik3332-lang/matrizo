import { z } from 'zod';

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

export const userSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string().nullable(),
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

export const newAddressInputSchema = z.object({
  label: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/),
  isDefault: z.boolean().optional(),
});

export const deliveryCheckSchema = z.object({
  pincode: z.string(),
  serviceable: z.boolean(),
  etaMinutes: z.number().nullable(),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});

export const orderStatusSchema = z.enum([
  'placed',
  'confirmed',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  addressId: z.string(),
  status: orderStatusSchema,
  paymentMethod: z.enum(['cod', 'razorpay']),
  paymentStatus: z.enum(['pending', 'paid', 'failed']),
  totalAmount: z.number(),
  razorpayOrderId: z.string().nullable(),
});

export const orderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type BulkPricingTier = z.infer<typeof bulkPricingTierSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type User = z.infer<typeof userSchema>;
export type Address = z.infer<typeof addressSchema>;
export type NewAddressInput = z.infer<typeof newAddressInputSchema>;
export type DeliveryCheck = z.infer<typeof deliveryCheckSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
