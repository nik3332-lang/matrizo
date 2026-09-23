export function CategoryBadge({
  category,
}: {
  category?: { name: string; colour?: string | null } | null;
}) {
  if (!category?.colour) return null;
  return (
    <span className="inline-flex items-center gap-2 text-xs text-stone-700">
      <span
        aria-hidden="true"
        style={{
          backgroundColor: category.colour,
          width: 16,
          height: 16,
          border: "1px solid #999",
          borderRadius: 3,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {category.name}
    </span>
  );
}
