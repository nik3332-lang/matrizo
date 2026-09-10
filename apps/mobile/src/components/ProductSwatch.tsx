import { Gradient } from './Gradient';
import { categoryIcon, Icon } from './Icon';

// Same role as apps/web's ProductSwatch — a colored header standing in for
// a product photo (none of the catalog has real images yet), so cards read
// as visually distinct tiles instead of bare text.
export function ProductSwatch({ colors, categorySlug }: { colors: readonly [string, string]; categorySlug?: string }) {
  return (
    <Gradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="h-16 -mx-4 -mt-4 mb-3 rounded-t-2xl items-center justify-center"
    >
      <Icon name={categoryIcon(categorySlug ?? '')} size={28} color="rgba(255,255,255,0.9)" />
    </Gradient>
  );
}
