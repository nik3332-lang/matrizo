import { useEffect, useState } from "react";
import { Catalog } from "@/components/Catalog";
import { Field } from "@/components/ui";
export default function Browse() {
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <Catalog
      path={
        search
          ? `/products/search?q=${encodeURIComponent(search)}`
          : "/products"
      }
      title={search ? "Search results" : "The collection"}
      header={
        <Field
          label="Find your next finish"
          value={query}
          onChangeText={setQuery}
          placeholder="Search taps, paints, pipes…"
          autoCorrect={false}
          returnKeyType="search"
          maxLength={100}
        />
      }
    />
  );
}
