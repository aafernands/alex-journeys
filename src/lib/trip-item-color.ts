/**
 * Soft accent colors for itinerary rows.
 * Each swatch stays at least 3:1 against cream paper (#fffcf7) and dark paper (#221e18),
 * and the check mark stays at least 3:1 against the swatch.
 */

export const TRIP_ITEM_COLORS = [
  { id: "coral", label: "Coral", hex: "#c4654a", check: "#1f1a14" },
  { id: "sky", label: "Sky", hex: "#4d86a8", check: "#1f1a14" },
  { id: "amber", label: "Amber", hex: "#b86a1e", check: "#1f1a14" },
  { id: "sage", label: "Sage", hex: "#5e7a62", check: "#fffcf7" },
  { id: "berry", label: "Berry", hex: "#a85d72", check: "#fffcf7" },
  { id: "clay", label: "Clay", hex: "#a68462", check: "#1f1a14" },
  { id: "stone", label: "Stone", hex: "#7a6e60", check: "#fffcf7" },
  { id: "plum", label: "Plum", hex: "#8a7496", check: "#1f1a14" },
] as const;

export type TripItemColor = (typeof TRIP_ITEM_COLORS)[number]["id"];

const COLOR_IDS = new Set<string>(TRIP_ITEM_COLORS.map((swatch) => swatch.id));

const FOOD_TITLE =
  /\b(breakfast|brunch|lunch|dinner|supper|restaurant|cafe|café|coffee|bakery|dessert|tasting|meal)\b/i;
const SHOPPING_TITLE = /\b(shopping|shop|shops|market|mall|boutique|souvenirs?)\b/i;

export function cleanItemColor(value: unknown): TripItemColor | "" {
  if (typeof value !== "string") return "";
  const id = value.trim().toLowerCase();
  return COLOR_IDS.has(id) ? (id as TripItemColor) : "";
}

/** Automatic swatch for a plan that has not chosen a color. */
export function defaultItemColor(item: { type?: string; title?: string }): TripItemColor {
  if (item.type === "hotel") return "coral";
  if (item.type === "flight") return "sky";
  if (item.type === "car") return "amber";
  if (item.type === "note") return "stone";
  const title = item.title ?? "";
  if (FOOD_TITLE.test(title)) return "berry";
  if (SHOPPING_TITLE.test(title)) return "clay";
  if (item.type === "other") return "clay";
  return "sage";
}

export function itemColorSwatch(item: { type?: string; title?: string; color?: string }) {
  const chosen = cleanItemColor(item.color);
  const id = chosen || defaultItemColor(item);
  return TRIP_ITEM_COLORS.find((swatch) => swatch.id === id) ?? TRIP_ITEM_COLORS[0];
}

export function itemAccentHex(item: { type?: string; title?: string; color?: string }): string {
  return itemColorSwatch(item).hex;
}
