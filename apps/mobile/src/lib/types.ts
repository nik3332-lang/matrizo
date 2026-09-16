import type { ProductBrand, OrderStatus } from "@matrizo/shared";
export type Category = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
};
export type Tier = { minQty: number; pricePerUnit: number };
export type Product = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  basePrice: number;
  imageUrl: string | null;
  brand: ProductBrand;
  categoryId: string;
  active: boolean;
  tiers: Tier[];
  specs: Record<string, string | number> | null;
  gstInvoiceEligible: boolean;
  category?: Category | null;
  stock?: { stockQty: number; storeName: string; etaMinutes: number } | null;
};
export type Address = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};
export type Cart = {
  items: {
    id: string;
    product: Product;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
};
export type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
};
export type OrderDetail = {
  order: Order;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
  events: { id: string; status: OrderStatus; createdAt: string }[];
  address: Address | null;
  delivery: { partnerName: string | null } | null;
};
