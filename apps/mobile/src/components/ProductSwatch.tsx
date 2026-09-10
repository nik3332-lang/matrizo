import { View } from 'react-native';

import { categoryIcon, Icon } from './Icon';

// Same role as apps/web's ProductSwatch — a colored header standing in for
// a product photo (none of the catalog has real images yet), so cards read
// as visually distinct tiles instead of bare text. Solid fill, not a
// gradient — flat color reads as professional, not a demo app.
export function ProductSwatch({ color, categorySlug }: { color: string; categorySlug?: string }) {
  return (
    <View style={{ backgroundColor: color }} className="h-16 -mx-4 -mt-4 mb-3 rounded-t-2xl items-center justify-center">
      <Icon name={categoryIcon(categorySlug ?? '')} size={28} color="rgba(255,255,255,0.9)" />
    </View>
  );
}
