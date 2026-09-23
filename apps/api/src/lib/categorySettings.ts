import { categories } from "../db/schema";
import type { getDb } from "../db/client";

export async function categorySettings(db: ReturnType<typeof getDb>) {
  const rows = await db.select().from(categories);
  return (id: string) => {
    const category = rows.find((row) => row.id === id);
    let current = category;
    let colour = category?.colour ?? null;
    let colourSelection = false;
    const visited = new Set<string>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      colour ??= current.colour;
      colourSelection ||= current.colourSelection;
      current = rows.find((row) => row.id === current?.parentId);
    }
    return category ? { ...category, colour, colourSelection } : null;
  };
}
