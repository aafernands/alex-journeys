/**
 * Homepage hero “From the road” strip items.
 * Kept free of path aliases so node tests can import this module.
 */

export type FromTheRoadItem = {
  label: string;
  href: string;
};

export const MAX_FROM_THE_ROAD_ITEMS = 6;

/** Live nav paths for the default hero strip items. */
export const DEFAULT_FROM_THE_ROAD_ITEMS: FromTheRoadItem[] = [
  { label: "Places visited", href: "/destinations" },
  { label: "Trip notes & photos", href: "/blog" },
  { label: "Tools I still use", href: "/tools" },
];

const FROM_THE_ROAD_HREF_BY_LABEL: Record<string, string> = {
  "places visited": "/destinations",
  "trip notes & photos": "/blog",
  "tools i still use": "/tools",
};

export type FromTheRoad = {
  label: string;
  items: FromTheRoadItem[];
};

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function defaultFromTheRoadHref(
  label: string,
  index: number,
  fallback: FromTheRoadItem[],
): string {
  const byLabel = FROM_THE_ROAD_HREF_BY_LABEL[label.trim().toLowerCase()];
  if (byLabel) return byLabel;
  const fromFallback = fallback[index]?.href?.trim();
  if (fromFallback) return fromFallback;
  return DEFAULT_FROM_THE_ROAD_ITEMS[index]?.href ?? "/destinations";
}

function parallelHrefAt(hrefs: unknown, index: number): string {
  if (!Array.isArray(hrefs)) return "";
  const value = hrefs[index];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFromTheRoadItem(
  raw: unknown,
  index: number,
  fallback: FromTheRoadItem[],
  hrefs: unknown,
): FromTheRoadItem | null {
  if (typeof raw === "string") {
    const label = raw.trim();
    if (!label) return null;
    const href =
      parallelHrefAt(hrefs, index) ||
      defaultFromTheRoadHref(label, index, fallback);
    return { label, href };
  }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const label = asString(o.label, fallback[index]?.label ?? "").trim();
  if (!label) return null;
  const explicitHref =
    asString(o.href, "").trim() || parallelHrefAt(hrefs, index);
  return {
    label,
    href: explicitHref || defaultFromTheRoadHref(label, index, fallback),
  };
}

export function normalizeFromTheRoad(
  raw: unknown,
  fallback: FromTheRoad,
): FromTheRoad {
  const fallbackItems = fallback.items.map((item) => ({ ...item }));
  if (!raw || typeof raw !== "object") {
    return {
      label: fallback.label,
      items: fallbackItems,
    };
  }
  const o = raw as Record<string, unknown>;
  const items = Array.isArray(o.items)
    ? o.items
        .slice(0, MAX_FROM_THE_ROAD_ITEMS)
        .map((item, i) =>
          normalizeFromTheRoadItem(item, i, fallback.items, o.hrefs),
        )
        .filter((item): item is FromTheRoadItem => item !== null)
    : fallbackItems;
  return {
    label: asString(o.label, fallback.label).trim() || fallback.label,
    items: items.length ? items : fallbackItems,
  };
}
