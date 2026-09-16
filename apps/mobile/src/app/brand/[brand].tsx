import { useLocalSearchParams } from "expo-router";
import { BRAND_LABELS, type ProductBrand } from "@matrizo/shared";
import { Catalog } from "@/components/Catalog";
export default function BrandCollection() {
  const { brand } = useLocalSearchParams<{ brand: string }>();
  return (
    <Catalog
      path={`/brands/${encodeURIComponent(brand ?? "")}/products`}
      title={BRAND_LABELS[brand as ProductBrand] ?? "Brand collection"}
    />
  );
}
