import type { ProductBrand } from "@matrizo/shared";
import type { ProductSpecs } from "./specs";
export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  basePrice: number;
  categoryId: string;
  brand: ProductBrand;
  imageUrl: string | null;
  tiers: { minQty: number; pricePerUnit: number }[];
  specs: ProductSpecs | null;
  gstInvoiceEligible: boolean;
};
export type CatalogData = {
  categories: Category[];
  brands: { brand: ProductBrand; name: string; productCount: number }[];
  featured: CatalogProduct[];
};
