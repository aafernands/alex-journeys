/**
 * Past-trip destinations for Fernandes Journeys.
 * Related blog posts are linked via destinations[] on each post.
 * Nested menu: Europe → Iceland; Americas → Canada, US, Mexico, Brazil.
 *
 * Tree data lives in src/content/destinations/tree.json (CMS-editable).
 * Optional trip fields (highlights, coverImages, etc.) are filled only from
 * facts already in linked posts — no invented hotels, dates, or itineraries.
 */

import treeJson from "@/content/destinations/tree.json";

export type DestinationCoverImage = {
  src: string;
  alt: string;
};

export type ClimateIcon =
  | "sun"
  | "cloud"
  | "partly-cloudy"
  | "rain"
  | "snow"
  | "storm";

export type ClimateQuality = "best" | "good" | "mixed" | "poor";

export type ClimateMonth = {
  /** Calendar month 1–12. */
  month: number;
  label: string;
  icon: ClimateIcon;
  /** Typical average temperature in °C. */
  avgC: number;
  quality: ClimateQuality;
};

export type DestinationClimate = {
  summary: string;
  bestTime: string;
  months: ClimateMonth[];
};

export type DestinationMapPin = {
  name: string;
  lat: number;
  lng: number;
  note?: string;
};

export type DestinationMapData = {
  center: [number, number];
  zoom: number;
  pins: DestinationMapPin[];
};

/** Compact “know before you go” strip on destination pages. */
export type DestinationQuickFacts = {
  bestTime?: string;
  currency?: string;
  language?: string;
  plugs?: string;
  tapWater?: string;
  timezone?: string;
};

export type DestinationCountry = {
  slug: string;
  name: string;
  region: string;
  continent: string;
  blurb: string;
  image: string;
  imageAlt: string;
  /** Short bullets drawn from the featured trip post. */
  highlights?: string[];
  /** Trip length when clear from the post title/copy (e.g. "1 week"). */
  tripLabel?: string;
  /** Extra photos from post HTML; omit when the post has none. */
  coverImages?: DestinationCoverImage[];
  /** Primary journal post for this place. */
  featuredPostSlug?: string;
  /** Static monthly climate norms (not a live forecast). */
  climate?: DestinationClimate;
  /** Visited places for the Leaflet map (from trip notes only). */
  map?: DestinationMapData;
  /** Best time + practical chips (currency, language, plugs, etc.). */
  quickFacts?: DestinationQuickFacts;
};

export type DestinationContinent = {
  id: string;
  name: string;
  countries: DestinationCountry[];
};

export const destinationsTree: DestinationContinent[] =
  treeJson as DestinationContinent[];

export function getAllDestinations(): DestinationCountry[] {
  return destinationsTree.flatMap((c) => c.countries);
}

export function getDestinationBySlug(
  slug: string,
): DestinationCountry | undefined {
  return getAllDestinations().find((d) => d.slug === slug);
}

export const destinationSlugs = getAllDestinations().map((d) => d.slug);
