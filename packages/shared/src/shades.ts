export type Shade = {
  id: string;
  family: string;
  name: string;
  hex: string;
  imageUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
};
export function shadeRgb(hex: string) {
  return [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16))
    .join(", ");
}
