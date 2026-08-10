import { z } from 'zod';

import {
  addressSchema,
  authTokensSchema,
  bulkPricingTierSchema,
  cartSchema,
  categorySchema,
  deliveryCheckSchema,
  type NewAddressInput,
  orderItemSchema,
  orderSchema,
  productSchema,
  userSchema,
} from './schemas';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type ApiClientConfig = {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
};

export function createApiClient({ baseUrl, getAccessToken }: ApiClientConfig) {
  async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    const token = getAccessToken?.();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

    const body: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = (body as { error?: string })?.error ?? `Request failed (${res.status})`;
      throw new ApiError(message, res.status);
    }
    return schema.parse(body);
  }

  return {
    // Auth
    requestOtp: (phone: string) =>
      request(
        '/auth/otp/request',
        z.object({ success: z.boolean(), devOtp: z.string().optional() }),
        { method: 'POST', body: JSON.stringify({ phone }) }
      ),
    verifyOtp: (phone: string, code: string) =>
      request('/auth/otp/verify', authTokensSchema, {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      }),
    refresh: (refreshToken: string) =>
      request('/auth/refresh', z.object({ accessToken: z.string() }), {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    // Catalog
    getCategories: () => request('/categories', z.object({ categories: z.array(categorySchema) })),
    getCategoryProducts: (slug: string) =>
      request(`/categories/${slug}/products`, z.object({ category: categorySchema, products: z.array(productSchema) })),
    getProduct: (id: string) =>
      request(`/products/${id}`, z.object({ product: productSchema, bulkPricingTiers: z.array(bulkPricingTierSchema) })),
    searchProducts: (q: string) =>
      request(`/products/search?q=${encodeURIComponent(q)}`, z.object({ products: z.array(productSchema) })),

    // Delivery
    checkDelivery: (pincode: string) => request(`/delivery/check?pincode=${pincode}`, deliveryCheckSchema),

    // Cart
    getCart: () => request('/cart', cartSchema),
    addToCart: (productId: string, quantity: number) =>
      request('/cart', z.object({ success: z.boolean() }), {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      }),
    updateCartItem: (itemId: string, quantity: number) =>
      request(`/cart/${itemId}`, z.object({ success: z.boolean() }), {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    removeCartItem: (itemId: string) =>
      request(`/cart/${itemId}`, z.object({ success: z.boolean() }), { method: 'DELETE' }),

    // Account
    getProfile: () => request('/account/profile', z.object({ user: userSchema })),
    updateProfile: (name: string) =>
      request('/account/profile', z.object({ success: z.boolean() }), {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    getAddresses: () => request('/account/addresses', z.object({ addresses: z.array(addressSchema) })),
    addAddress: (input: NewAddressInput) =>
      request('/account/addresses', z.object({ success: z.boolean(), id: z.string() }), {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    // Orders
    createOrder: (addressId: string, paymentMethod: 'cod' | 'razorpay') =>
      request(
        '/orders',
        z.object({ orderId: z.string(), total: z.number(), razorpayOrderId: z.string().nullable() }),
        { method: 'POST', body: JSON.stringify({ addressId, paymentMethod }) }
      ),
    getOrders: () => request('/orders', z.object({ orders: z.array(orderSchema) })),
    getOrder: (id: string) =>
      request(`/orders/${id}`, z.object({ order: orderSchema, items: z.array(orderItemSchema) })),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
