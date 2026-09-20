import type {
  ClimateIcon,
  ClimateMonth,
  ClimateQuality,
  DestinationClimate,
  DestinationContinent,
  DestinationCountry,
  DestinationCoverImage,
  DestinationItinerary,
  DestinationItineraryDay,
  DestinationMapData,
  DestinationMapPin,
  DestinationQuickFacts,
} from "@/data/destinations";
import { sanitizeSlug } from "@/lib/cms/validate";

const CLIMATE_ICONS = new Set<ClimateIcon>([
  "sun",
  "cloud",
  "partly-cloudy",
  "rain",
  "snow",
  "storm",
]);

const CLIMATE_QUALITIES = new Set<ClimateQuality>([
  "best",
  "good",
  "mixed",
  "poor",
]);

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function validateCoverImages(
  raw: unknown,
):
  | { ok: true; data?: DestinationCoverImage[] }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "coverImages must be an array." };
  }
  const images: DestinationCoverImage[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: `coverImages[${i}] must be an object.` };
    }
    const rec = item as Record<string, unknown>;
    const src = asString(rec.src);
    const alt = asString(rec.alt);
    if (!src || !isHttpUrl(src)) {
      return {
        ok: false,
        error: `coverImages[${i}].src must be a valid http(s) URL.`,
      };
    }
    if (!alt) {
      return { ok: false, error: `coverImages[${i}].alt is required.` };
    }
    images.push({ src, alt });
  }
  return { ok: true, data: images.length ? images : undefined };
}

function validateMap(
  raw: unknown,
):
  | { ok: true; data?: DestinationMapData }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true };
  }
  if (typeof raw !== "object") {
    return { ok: false, error: "map must be an object." };
  }
  const rec = raw as Record<string, unknown>;
  const centerRaw = rec.center;
  if (!Array.isArray(centerRaw) || centerRaw.length !== 2) {
    return { ok: false, error: "map.center must be [lat, lng]." };
  }
  const lat = asNumber(centerRaw[0]);
  const lng = asNumber(centerRaw[1]);
  if (lat === null || lng === null) {
    return { ok: false, error: "map.center lat/lng must be numbers." };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: "map.center out of range." };
  }
  const zoom = asNumber(rec.zoom);
  if (zoom === null || zoom < 1 || zoom > 20) {
    return { ok: false, error: "map.zoom must be a number between 1 and 20." };
  }
  if (!Array.isArray(rec.pins)) {
    return { ok: false, error: "map.pins must be an array." };
  }
  const pins: DestinationMapPin[] = [];
  for (let i = 0; i < rec.pins.length; i++) {
    const pin = rec.pins[i];
    if (typeof pin !== "object" || pin === null) {
      return { ok: false, error: `map.pins[${i}] must be an object.` };
    }
    const p = pin as Record<string, unknown>;
    const name = asString(p.name);
    const plat = asNumber(p.lat);
    const plng = asNumber(p.lng);
    if (!name) {
      return { ok: false, error: `map.pins[${i}].name is required.` };
    }
    if (plat === null || plng === null) {
      return { ok: false, error: `map.pins[${i}] lat/lng must be numbers.` };
    }
    if (plat < -90 || plat > 90 || plng < -180 || plng > 180) {
      return { ok: false, error: `map.pins[${i}] coordinates out of range.` };
    }
    const note = asString(p.note);
    const out: DestinationMapPin = { name, lat: plat, lng: plng };
    if (note) out.note = note;
    pins.push(out);
  }
  return {
    ok: true,
    data: { center: [lat, lng], zoom, pins },
  };
}

function validateClimate(
  raw: unknown,
):
  | { ok: true; data?: DestinationClimate }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true };
  }
  if (typeof raw !== "object") {
    return { ok: false, error: "climate must be an object." };
  }
  const rec = raw as Record<string, unknown>;
  const summary = asString(rec.summary);
  const bestTime = asString(rec.bestTime);
  if (!summary) {
    return { ok: false, error: "climate.summary is required." };
  }
  if (!bestTime) {
    return { ok: false, error: "climate.bestTime is required." };
  }
  if (!Array.isArray(rec.months) || rec.months.length !== 12) {
    return { ok: false, error: "climate.months must have exactly 12 entries." };
  }
  const months: ClimateMonth[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < 12; i++) {
    const m = rec.months[i];
    if (typeof m !== "object" || m === null) {
      return { ok: false, error: `climate.months[${i}] must be an object.` };
    }
    const mr = m as Record<string, unknown>;
    const month = asNumber(mr.month);
    if (month === null || month < 1 || month > 12 || !Number.isInteger(month)) {
      return {
        ok: false,
        error: `climate.months[${i}].month must be an integer 1–12.`,
      };
    }
    if (seen.has(month)) {
      return {
        ok: false,
        error: `Duplicate climate month: ${month}.`,
      };
    }
    seen.add(month);
    const label = asString(mr.label);
    if (!label) {
      return { ok: false, error: `climate.months[${i}].label is required.` };
    }
    const icon = asString(mr.icon) as ClimateIcon;
    if (!CLIMATE_ICONS.has(icon)) {
      return {
        ok: false,
        error: `climate.months[${i}].icon must be one of: ${[...CLIMATE_ICONS].join(", ")}.`,
      };
    }
    const avgC = asNumber(mr.avgC);
    if (avgC === null) {
      return { ok: false, error: `climate.months[${i}].avgC must be a number.` };
    }
    const quality = asString(mr.quality) as ClimateQuality;
    if (!CLIMATE_QUALITIES.has(quality)) {
      return {
        ok: false,
        error: `climate.months[${i}].quality must be one of: ${[...CLIMATE_QUALITIES].join(", ")}.`,
      };
    }
    months.push({ month, label, icon, avgC, quality });
  }
  months.sort((a, b) => a.month - b.month);
  return { ok: true, data: { summary, bestTime, months } };
}


function validateQuickFacts(
  raw: unknown,
):
  | { ok: true; data?: DestinationQuickFacts }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true };
  }
  if (typeof raw !== "object") {
    return { ok: false, error: "quickFacts must be an object." };
  }
  const rec = raw as Record<string, unknown>;
  const out: DestinationQuickFacts = {};
  const keys = [
    "bestTime",
    "currency",
    "language",
    "plugs",
    "tapWater",
    "timezone",
  ] as const;
  for (const key of keys) {
    if (rec[key] === undefined || rec[key] === null || rec[key] === "") {
      continue;
    }
    if (typeof rec[key] !== "string") {
      return { ok: false, error: `quickFacts.${key} must be a string.` };
    }
    const value = asString(rec[key]);
    if (!value) continue;
    if (value.length > 200) {
      return {
        ok: false,
        error: `quickFacts.${key} must be at most 200 characters.`,
      };
    }
    out[key] = value;
  }
  return { ok: true, data: Object.keys(out).length ? out : undefined };
}


function validateItinerary(
  raw: unknown,
):
  | { ok: true; data?: DestinationItinerary }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true };
  }
  if (typeof raw !== "object") {
    return { ok: false, error: "itinerary must be an object." };
  }
  const rec = raw as Record<string, unknown>;
  const title = asString(rec.title) || undefined;
  if (title && title.length > 160) {
    return { ok: false, error: "itinerary.title must be at most 160 characters." };
  }
  if (!Array.isArray(rec.days)) {
    return { ok: false, error: "itinerary.days must be an array." };
  }
  if (rec.days.length > 21) {
    return { ok: false, error: "itinerary.days supports at most 21 entries." };
  }
  const days: DestinationItineraryDay[] = [];
  for (let i = 0; i < rec.days.length; i++) {
    const item = rec.days[i];
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: `itinerary.days[${i}] must be an object.` };
    }
    const d = item as Record<string, unknown>;
    const day = asString(d.day);
    const dayTitle = asString(d.title);
    const detail = asString(d.detail);
    if (!day && !dayTitle && !detail) {
      continue;
    }
    if (!day) {
      return { ok: false, error: `itinerary.days[${i}].day is required.` };
    }
    if (!dayTitle) {
      return { ok: false, error: `itinerary.days[${i}].title is required.` };
    }
    if (!detail) {
      return { ok: false, error: `itinerary.days[${i}].detail is required.` };
    }
    if (day.length > 40) {
      return {
        ok: false,
        error: `itinerary.days[${i}].day must be at most 40 characters.`,
      };
    }
    if (dayTitle.length > 160) {
      return {
        ok: false,
        error: `itinerary.days[${i}].title must be at most 160 characters.`,
      };
    }
    if (detail.length > 800) {
      return {
        ok: false,
        error: `itinerary.days[${i}].detail must be at most 800 characters.`,
      };
    }
    days.push({ day, title: dayTitle, detail });
  }
  if (days.length === 0) {
    return { ok: true };
  }
  const out: DestinationItinerary = { days };
  if (title) out.title = title;
  return { ok: true, data: out };
}

export type DestinationCountryInput = Record<string, unknown>;

export type ValidatedDestinationCountry = DestinationCountry;

export function validateDestinationCountry(
  input: DestinationCountryInput,
):
  | { ok: true; data: ValidatedDestinationCountry }
  | { ok: false; error: string } {
  const name = asString(input.name);
  if (!name || name.length > 120) {
    return { ok: false, error: "Name is required (max 120 characters)." };
  }

  const slug = sanitizeSlug(input.slug);
  if (!slug) {
    return {
      ok: false,
      error:
        "Slug must be kebab-case (lowercase letters, numbers, hyphens only).",
    };
  }

  const region = asString(input.region);
  if (!region || region.length > 80) {
    return { ok: false, error: "Region is required (max 80 characters)." };
  }

  const continent = asString(input.continent);
  if (!continent || continent.length > 80) {
    return { ok: false, error: "Continent is required (max 80 characters)." };
  }

  const blurb = asString(input.blurb);
  if (!blurb || blurb.length > 600) {
    return { ok: false, error: "Blurb is required (max 600 characters)." };
  }

  const image = asString(input.image);
  if (!image || !isHttpUrl(image)) {
    return { ok: false, error: "Image URL must be a valid http(s) URL." };
  }

  const imageAlt = asString(input.imageAlt);
  if (!imageAlt || imageAlt.length > 200) {
    return { ok: false, error: "Image alt is required (max 200 characters)." };
  }

  let highlights: string[] | undefined;
  if (input.highlights !== undefined && input.highlights !== null) {
    if (Array.isArray(input.highlights)) {
      highlights = input.highlights
        .map((h) => asString(h))
        .filter(Boolean);
    } else if (typeof input.highlights === "string") {
      highlights = input.highlights
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean);
    } else {
      return { ok: false, error: "highlights must be a string or string[]." };
    }
    if (highlights.length === 0) highlights = undefined;
  }

  const tripLabel = asString(input.tripLabel) || undefined;
  const featuredPostSlugRaw = asString(input.featuredPostSlug);
  let featuredPostSlug: string | undefined;
  if (featuredPostSlugRaw) {
    const sanitized = sanitizeSlug(featuredPostSlugRaw);
    if (!sanitized) {
      return {
        ok: false,
        error: "featuredPostSlug must be kebab-case.",
      };
    }
    featuredPostSlug = sanitized;
  }

  const coverResult = validateCoverImages(input.coverImages);
  if (!coverResult.ok) return coverResult;

  const mapResult = validateMap(input.map);
  if (!mapResult.ok) return mapResult;

  const climateResult = validateClimate(input.climate);
  if (!climateResult.ok) return climateResult;

  const quickFactsResult = validateQuickFacts(input.quickFacts);
  if (!quickFactsResult.ok) return quickFactsResult;

  const itineraryResult = validateItinerary(input.itinerary);
  if (!itineraryResult.ok) return itineraryResult;

  const country: DestinationCountry = {
    slug,
    name,
    region,
    continent,
    blurb,
    image,
    imageAlt,
  };
  if (highlights) country.highlights = highlights;
  if (tripLabel) country.tripLabel = tripLabel;
  if (featuredPostSlug) country.featuredPostSlug = featuredPostSlug;
  if (coverResult.data) country.coverImages = coverResult.data;
  if (climateResult.data) country.climate = climateResult.data;
  if (mapResult.data) country.map = mapResult.data;
  if (quickFactsResult.data) country.quickFacts = quickFactsResult.data;
  if (itineraryResult.data) country.itinerary = itineraryResult.data;

  return { ok: true, data: country };
}

const CONTINENT_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sanitizeContinentId(raw: unknown): string | null {
  const id = asString(raw).toLowerCase();
  if (!id || id.length > 60) return null;
  if (!CONTINENT_ID_RE.test(id)) return null;
  return id;
}

/**
 * Upsert a country into the destinations tree by continent id.
 * Creates the continent if missing (requires continentName).
 * When update is true, replaces an existing country with the same slug
 * (must already exist). When false, rejects duplicate slugs.
 */
export function upsertCountryInTree(
  tree: DestinationContinent[],
  country: DestinationCountry,
  continentId: string,
  options?: { continentName?: string; update?: boolean },
):
  | { ok: true; tree: DestinationContinent[]; created: boolean }
  | { ok: false; error: string } {
  const id = sanitizeContinentId(continentId);
  if (!id) {
    return {
      ok: false,
      error: "continentId must be kebab-case (e.g. europe, americas).",
    };
  }

  const next: DestinationContinent[] = tree.map((c) => ({
    ...c,
    countries: [...c.countries],
  }));

  const existingIndex = next.findIndex((c) =>
    c.countries.some((x) => x.slug === country.slug),
  );
  const exists = existingIndex >= 0;

  if (options?.update) {
    if (!exists) {
      return {
        ok: false,
        error: `No destination with slug "${country.slug}" to update.`,
      };
    }
  } else if (exists) {
    return {
      ok: false,
      error: `A destination with slug "${country.slug}" already exists.`,
    };
  }

  // Remove from any continent if updating (allows moving continents)
  if (exists) {
    for (const cont of next) {
      cont.countries = cont.countries.filter((x) => x.slug !== country.slug);
    }
  }

  let continent = next.find((c) => c.id === id);
  if (!continent) {
    const name =
      asString(options?.continentName) || country.continent || id;
    if (!name) {
      return {
        ok: false,
        error: "continentName is required when creating a new continent.",
      };
    }
    continent = { id, name, countries: [] };
    next.push(continent);
  } else if (options?.continentName) {
    const name = asString(options.continentName);
    if (name) continent.name = name;
  }

  continent.countries.push(country);
  continent.countries.sort((a, b) => a.name.localeCompare(b.name));

  return { ok: true, tree: next, created: !exists };
}

export const DEFAULT_CLIMATE_MONTHS: ClimateMonth[] = [
  { month: 1, label: "January", icon: "cloud", avgC: 5, quality: "mixed" },
  { month: 2, label: "February", icon: "cloud", avgC: 6, quality: "mixed" },
  { month: 3, label: "March", icon: "partly-cloudy", avgC: 9, quality: "good" },
  { month: 4, label: "April", icon: "rain", avgC: 12, quality: "good" },
  { month: 5, label: "May", icon: "partly-cloudy", avgC: 16, quality: "best" },
  { month: 6, label: "June", icon: "sun", avgC: 20, quality: "best" },
  { month: 7, label: "July", icon: "sun", avgC: 22, quality: "best" },
  { month: 8, label: "August", icon: "sun", avgC: 22, quality: "best" },
  { month: 9, label: "September", icon: "partly-cloudy", avgC: 18, quality: "good" },
  { month: 10, label: "October", icon: "rain", avgC: 13, quality: "mixed" },
  { month: 11, label: "November", icon: "cloud", avgC: 9, quality: "mixed" },
  { month: 12, label: "December", icon: "cloud", avgC: 6, quality: "poor" },
];

export const CLIMATE_ICON_OPTIONS: ClimateIcon[] = [
  "sun",
  "cloud",
  "partly-cloudy",
  "rain",
  "snow",
  "storm",
];

export const CLIMATE_QUALITY_OPTIONS: ClimateQuality[] = [
  "best",
  "good",
  "mixed",
  "poor",
];
