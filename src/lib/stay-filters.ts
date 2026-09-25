/**
 * Manual stays-result filters. Safe to import from client components.
 * LiteAPI request fields are applied in stays-service; everything else
 * narrows the mapped list here.
 */

export const STAY_AMENITY_KEYS = [
  "wifi",
  "pool",
  "parking",
  "breakfast",
  "gym",
  "spa",
  "pets",
  "ac",
  "beach",
] as const;

export type StayAmenityKey = (typeof STAY_AMENITY_KEYS)[number];

export type StaySort = "popular" | "price_asc" | "price_desc" | "rating" | "stars";

export type StayKind = "any" | "hotel" | "home";

export type StayGuestMinimum = 0 | 7 | 8 | 9;

export type StayResultFilters = {
  sort: StaySort;
  /** Total for the selected dates, in the rate currency (USD). */
  minPrice: number | null;
  maxPrice: number | null;
  /** Minimum guest score on a 10-point scale. 0 means any. */
  guestRating: StayGuestMinimum;
  /** Whole-star multi-select, 1 through 5. */
  stars: number[];
  amenities: StayAmenityKey[];
  freeCancellation: boolean;
  kind: StayKind;
};

export type StayAmenityOption = {
  key: StayAmenityKey;
  label: string;
  facilityId: number;
  /** English facility name from LiteAPI, used only to explain the match. */
  facilityName: string;
};

export type StayPriceBounds = {
  min: number;
  max: number;
};

export type StayFilterable = {
  name: string;
  rating: number | null;
  stars: number | null;
  fromPrice: { amount: number; currency: string } | null;
};

export const DEFAULT_STAY_FILTERS: StayResultFilters = {
  sort: "popular",
  minPrice: null,
  maxPrice: null,
  guestRating: 0,
  stars: [],
  amenities: [],
  freeCancellation: false,
  kind: "any",
};

const AMENITY_LABELS: Record<StayAmenityKey, string> = {
  wifi: "Free Wi-Fi",
  pool: "Pool",
  parking: "Parking",
  breakfast: "Breakfast",
  gym: "Gym",
  spa: "Spa",
  pets: "Pet-friendly",
  ac: "Air conditioning",
  beach: "Beach",
};

const SORTS = new Set<StaySort>(["popular", "price_asc", "price_desc", "rating", "stars"]);

export function stayAmenityLabel(key: StayAmenityKey): string {
  return AMENITY_LABELS[key];
}

export function staySortLabel(sort: StaySort): string {
  if (sort === "price_asc") return "Price: low to high";
  if (sort === "price_desc") return "Price: high to low";
  if (sort === "rating") return "Guest rating";
  if (sort === "stars") return "Star rating";
  return "Popular";
}

export function stayResultsHeading(sort: StaySort): string {
  if (sort === "price_asc") return "Lowest price";
  if (sort === "price_desc") return "Highest price";
  if (sort === "rating") return "Top guest ratings";
  if (sort === "stars") return "Top star ratings";
  return "Recommended stays";
}

/** True when a control should look selected. Sort is not a narrowing filter. */
export function stayFilterCount(filters: StayResultFilters): number {
  let count = 0;
  if (filters.minPrice != null || filters.maxPrice != null) count += 1;
  if (filters.guestRating) count += 1;
  count += filters.stars.length;
  count += filters.amenities.length;
  if (filters.freeCancellation) count += 1;
  if (filters.kind !== "any") count += 1;
  return count;
}

export function hasNarrowingStayFilters(filters: StayResultFilters): boolean {
  return stayFilterCount(filters) > 0;
}

/** Filters that change the LiteAPI rates request, not the local price or guest pass. */
export function hasLiteApiStayFilters(filters: StayResultFilters): boolean {
  return (
    filters.stars.length > 0 ||
    filters.amenities.length > 0 ||
    filters.freeCancellation ||
    filters.kind !== "any"
  );
}

export function clearStayFilters(filters: StayResultFilters): StayResultFilters {
  return { ...DEFAULT_STAY_FILTERS, sort: filters.sort };
}

function firstParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function cleanPrice(raw: string): number | null {
  const value = raw.trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value)) return null;
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000) return null;
  return amount;
}

function cleanSort(raw: string): StaySort {
  return SORTS.has(raw as StaySort) ? (raw as StaySort) : "popular";
}

function cleanGuest(raw: string): StayGuestMinimum {
  if (raw === "7" || raw === "8" || raw === "9") return Number(raw) as StayGuestMinimum;
  return 0;
}

function cleanKind(raw: string): StayKind {
  if (raw === "hotel" || raw === "home") return raw;
  return "any";
}

function cleanStars(raw: string): number[] {
  const stars = new Set<number>();
  for (const part of raw.split(",")) {
    const value = part.trim();
    if (!/^[1-5]$/.test(value)) continue;
    stars.add(Number(value));
  }
  return [...stars].sort((a, b) => a - b);
}

function cleanAmenities(raw: string): StayAmenityKey[] {
  const picked = new Set<StayAmenityKey>();
  for (const part of raw.split(",")) {
    const key = part.trim().toLowerCase();
    if ((STAY_AMENITY_KEYS as readonly string[]).includes(key)) {
      picked.add(key as StayAmenityKey);
    }
  }
  return STAY_AMENITY_KEYS.filter((key) => picked.has(key));
}

export function parseStayFilters(
  searchParams: Record<string, string | string[] | undefined>,
): StayResultFilters {
  let minPrice = cleanPrice(firstParam(searchParams, "minPrice"));
  let maxPrice = cleanPrice(firstParam(searchParams, "maxPrice"));
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    const swap = minPrice;
    minPrice = maxPrice;
    maxPrice = swap;
  }
  return {
    sort: cleanSort(firstParam(searchParams, "sort").trim()),
    minPrice,
    maxPrice,
    guestRating: cleanGuest(firstParam(searchParams, "guest").trim()),
    stars: cleanStars(firstParam(searchParams, "stars")),
    amenities: cleanAmenities(firstParam(searchParams, "amenity")),
    freeCancellation: firstParam(searchParams, "cancel") === "1",
    kind: cleanKind(firstParam(searchParams, "kind").trim()),
  };
}

/** Non-default filter params, in a stable order. */
export function stayFilterSearchParams(filters: StayResultFilters): Array<[string, string]> {
  const params: Array<[string, string]> = [];
  if (filters.sort !== "popular") params.push(["sort", filters.sort]);
  if (filters.minPrice != null) params.push(["minPrice", String(filters.minPrice)]);
  if (filters.maxPrice != null) params.push(["maxPrice", String(filters.maxPrice)]);
  if (filters.guestRating) params.push(["guest", String(filters.guestRating)]);
  if (filters.stars.length) params.push(["stars", filters.stars.join(",")]);
  if (filters.amenities.length) params.push(["amenity", filters.amenities.join(",")]);
  if (filters.freeCancellation) params.push(["cancel", "1"]);
  if (filters.kind !== "any") params.push(["kind", filters.kind]);
  return params;
}

/**
 * Half-star values to send as LiteAPI `starRating`.
 * Cards round to the nearest whole star (3.5 displays as 4, 4.5 as 5).
 */
export function starRatingQueryValues(stars: number[]): number[] {
  const values = new Set<number>();
  for (const star of stars) {
    if (star < 1 || star > 5) continue;
    if (star >= 2) values.add(star - 0.5);
    values.add(star);
  }
  return [...values].sort((a, b) => a - b);
}

/** Guest scores at or below 5 are treated as a 5-point scale and stretched to 10. */
export function stayGuestScore10(rating: number | null | undefined): number | null {
  if (rating == null || !Number.isFinite(rating) || rating < 0) return null;
  if (rating <= 5) return Math.round(rating * 2 * 10) / 10;
  return rating;
}

export function displayedStarCount(stars: number | null | undefined): number | null {
  if (stars == null || !Number.isFinite(stars)) return null;
  const rounded = Math.round(stars);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

export function stayPriceBounds(stays: readonly StayFilterable[]): StayPriceBounds | null {
  let min = Infinity;
  let max = -Infinity;
  for (const stay of stays) {
    const amount = stay.fromPrice?.amount;
    if (amount == null || !Number.isFinite(amount)) continue;
    if (amount < min) min = amount;
    if (amount > max) max = amount;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min: Math.floor(min), max: Math.ceil(max) };
}

function priceRank(stay: StayFilterable): number | null {
  const amount = stay.fromPrice?.amount;
  if (amount == null || !Number.isFinite(amount)) return null;
  return amount;
}

export function applyStayFilters<T extends StayFilterable>(
  stays: readonly T[],
  filters: StayResultFilters,
): T[] {
  const filtered = stays.filter((stay) => {
    if (filters.minPrice != null || filters.maxPrice != null) {
      const amount = priceRank(stay);
      if (amount == null) return false;
      if (filters.minPrice != null && amount < filters.minPrice) return false;
      if (filters.maxPrice != null && amount > filters.maxPrice) return false;
    }
    if (filters.guestRating) {
      const score = stayGuestScore10(stay.rating);
      if (score == null || score < filters.guestRating) return false;
    }
    if (filters.stars.length) {
      const stars = displayedStarCount(stay.stars);
      if (stars == null || !filters.stars.includes(stars)) return false;
    }
    return true;
  });

  const list = [...filtered];
  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    const direction = filters.sort === "price_asc" ? 1 : -1;
    list.sort((a, b) => {
      const left = priceRank(a);
      const right = priceRank(b);
      if (left == null && right == null) return a.name.localeCompare(b.name);
      if (left == null) return 1;
      if (right == null) return -1;
      if (left !== right) return (left - right) * direction;
      return a.name.localeCompare(b.name);
    });
  } else if (filters.sort === "rating") {
    list.sort((a, b) => {
      const left = stayGuestScore10(a.rating);
      const right = stayGuestScore10(b.rating);
      if (left == null && right == null) return a.name.localeCompare(b.name);
      if (left == null) return 1;
      if (right == null) return -1;
      if (left !== right) return right - left;
      return a.name.localeCompare(b.name);
    });
  } else if (filters.sort === "stars") {
    list.sort((a, b) => {
      const left = displayedStarCount(a.stars);
      const right = displayedStarCount(b.stars);
      if (left == null && right == null) return a.name.localeCompare(b.name);
      if (left == null) return 1;
      if (right == null) return -1;
      if (left !== right) return right - left;
      const rating = (stayGuestScore10(b.rating) ?? -1) - (stayGuestScore10(a.rating) ?? -1);
      if (rating !== 0) return rating;
      return a.name.localeCompare(b.name);
    });
  }
  return list;
}

export function pricePillLabel(filters: StayResultFilters): string {
  const { minPrice, maxPrice } = filters;
  if (minPrice == null && maxPrice == null) return "Price";
  const money = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  if (minPrice != null && maxPrice != null) return `${money(minPrice)}–${money(maxPrice)}`;
  if (minPrice != null) return `${money(minPrice)}+`;
  return `Up to ${money(maxPrice ?? 0)}`;
}

export function guestPillLabel(guestRating: StayGuestMinimum): string {
  return guestRating ? `${guestRating}+` : "Guest rating";
}

function facilityText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesWord(name: string, word: string): boolean {
  return ` ${name} `.includes(` ${word} `);
}

/**
 * Higher scores win. Zero means this facility is not that amenity.
 * One amenity maps to a single facility id because LiteAPI's strict
 * facility filter is AND across every id, with no OR groups.
 */
export function scoreStayAmenity(key: StayAmenityKey, facilityName: string): number {
  const name = facilityText(facilityName);
  if (!name) return 0;
  if (key === "wifi") {
    if (!/wi fi|wifi|wireless/.test(name)) return 0;
    if (/paid|charge|fee/.test(name)) return 0;
    if (/free/.test(name)) return name === "free wifi" || name === "free wi fi" ? 5 : 4;
    if (name === "wifi" || name === "wi fi" || name === "wireless internet") return 3;
    return 1;
  }
  if (key === "pool") {
    if (/pool table|billiard|snooker|whirlpool/.test(name)) return 0;
    if (!name.includes("pool")) return 0;
    if (name === "swimming pool" || name === "pool") return 5;
    if (/outdoor pool|indoor pool/.test(name)) return 4;
    return 2;
  }
  if (key === "parking") {
    if (!name.includes("parking")) return 0;
    if (/no parking|without parking/.test(name)) return 0;
    if (/free/.test(name)) return 5;
    if (name === "parking") return 4;
    return 2;
  }
  if (key === "breakfast") {
    if (!name.includes("breakfast")) return 0;
    if (/surcharge|extra charge|paid|fee|not included/.test(name)) return 0;
    if (/free|included/.test(name)) return 5;
    if (name === "breakfast") return 4;
    return 2;
  }
  if (key === "gym") {
    if (name === "fitness center" || name === "gym" || name === "fitness room") return 5;
    if (/fitness center|fitness room|fitness centre|gym/.test(name)) return 4;
    if (name.includes("fitness")) return 2;
    return 0;
  }
  if (key === "spa") {
    if (/spa tub|jacuzzi|whirlpool/.test(name) && !includesWord(name, "spa")) return 0;
    if (name === "spa" || name === "spa center" || name === "spa centre" || name === "full service spa") {
      return 5;
    }
    if (includesWord(name, "spa")) return 3;
    return 0;
  }
  if (key === "pets") {
    if (/no pet|not pet|pets not/.test(name)) return 0;
    if (/pet friendly|pets allowed|pets permitted/.test(name)) return 5;
    if (name.includes("pet")) return 3;
    return 0;
  }
  if (key === "ac") {
    if (/no air|without air/.test(name)) return 0;
    if (name === "air conditioning" || name === "air conditioning in rooms") return 5;
    if (name.includes("air conditioning")) return 4;
    return 0;
  }
  if (key === "beach") {
    if (/towel|chair|umbrella|bag|volleyball/.test(name)) return 0;
    if (/beachfront|beach front|private beach|beach access|on the beach|direct beach/.test(name)) {
      return 5;
    }
    if (name === "beach" || name === "beach nearby") return 4;
    return 0;
  }
  return 0;
}

export function amenityLabelForFacility(key: StayAmenityKey, facilityName: string): string {
  const name = facilityText(facilityName);
  if (key === "wifi") return /free/.test(name) ? "Free Wi-Fi" : "Wi-Fi";
  if (key === "parking") return /free/.test(name) ? "Free parking" : "Parking";
  if (key === "breakfast") return /free|included/.test(name) ? "Free breakfast" : "Breakfast";
  return AMENITY_LABELS[key];
}

const HOME_TYPES = [
  "apartment",
  "apartments",
  "villa",
  "villas",
  "residence",
  "residences",
  "holiday home",
  "holiday homes",
  "vacation home",
  "vacation homes",
  "condo",
  "condos",
  "condominium",
  "cottage",
  "cottages",
  "chalet",
  "chalets",
  "homestay",
  "homestays",
  "gite",
  "gites",
  "country house",
  "country houses",
  "farm stay",
  "farm stays",
  "guest house",
  "guest houses",
  "bed and breakfast",
  "bed and breakfasts",
  "cabin",
  "cabins",
  "bungalow",
  "bungalows",
  "aparthotel",
  "aparthotels",
  "lodge",
  "lodges",
  "townhouse",
  "townhouses",
  "house",
  "houses",
];

const HOTEL_TYPES = [
  "hotel",
  "hotels",
  "resort",
  "resorts",
  "motel",
  "motels",
  "inn",
  "inns",
  "hostel",
  "hostels",
  "riad",
  "riads",
  "capsule hotel",
  "capsule hotels",
  "economy hotel",
  "economy hotels",
  "boutique hotel",
  "boutique hotels",
  "pension",
  "pensions",
  "health resort",
  "love hotel",
];

function hasTypeName(name: string, item: string): boolean {
  if (name === item) return true;
  return new RegExp(`(?:^| )${item}(?: |$)`).test(name);
}

/** Homes are matched before hotels so "aparthotel" stays with homes. */
export function classifyStayPropertyType(typeName: string): "hotel" | "home" | null {
  const name = facilityText(typeName);
  if (!name || /camp|boat|uncertain|cruise/.test(name)) return null;
  if (HOME_TYPES.some((item) => hasTypeName(name, item))) return "home";
  if (HOTEL_TYPES.some((item) => hasTypeName(name, item))) return "hotel";
  return null;
}
