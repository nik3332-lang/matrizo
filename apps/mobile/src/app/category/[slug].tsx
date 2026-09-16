import { useLocalSearchParams } from "expo-router";
import { Catalog } from "@/components/Catalog";
export default function Category() {
  const { slug, name } = useLocalSearchParams<{
    slug: string;
    name?: string;
  }>();
  return (
    <Catalog
      path={`/categories/${encodeURIComponent(slug ?? "")}/products`}
      title={name ?? (slug ?? "Collection").replace(/-/g, " ")}
    />
  );
}
