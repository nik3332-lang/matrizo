// STAGE 3: replaces every "Loading…" text / blank space with a shape that
// previews the content about to arrive — no spinners. `Skeleton` is the
// primitive block; the *Skeleton composites below match the exact layout
// of the real component they stand in for (ProductCard, category tile,
// etc.) so nothing reflows when data lands.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-stone-100 ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface overflow-hidden">
      <Skeleton className="h-28 rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function TileSkeleton() {
  return (
    <div className="glass rounded-card p-5 text-center space-y-3">
      <Skeleton className="mx-auto h-14 w-14 rounded-full" />
      <Skeleton className="mx-auto h-4 w-2/3" />
    </div>
  );
}

export function RowSkeleton({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-16 ${className}`} />;
}
