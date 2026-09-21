import {
  PLANNER_CITIES,
  PLANNER_CITY_ALIASES,
} from "../data/planner-cities.mjs";

export type PlaceSuggestion = {
  label: string;
  journal: boolean;
  iata?: string;
};

type Entry = {
  city: string;
  country: string;
  label: string;
  iata?: string;
  aliases: string[];
  journal: boolean;
  normLabel: string;
  normCity: string;
};

const LIMIT = 8;

export function foldPlace(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function entry(
  city: string,
  country: string,
  iata: string | undefined,
  journal: boolean,
): Entry {
  const aliases =
    (PLANNER_CITY_ALIASES as Record<string, readonly string[]>)[
      `${city}|${country}`
    ] ?? [];
  return {
    city,
    country,
    label: `${city}, ${country}`,
    iata: iata || undefined,
    aliases: [...aliases],
    journal,
    normLabel: foldPlace(`${city}, ${country}`),
    normCity: foldPlace(city),
  };
}

const STATIC_PLACES: Entry[] = (
  PLANNER_CITIES as unknown as readonly (readonly [string, string, string?])[]
).map(([city, country, iata]) => entry(city, country, iata, false));

const staticByLabel = new Map(
  STATIC_PLACES.map((place) => [place.normLabel, place]),
);

function journalEntries(labels: readonly string[]): Entry[] {
  const extras: Entry[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    const comma = label.lastIndexOf(",");
    if (comma <= 0) continue;
    const city = label.slice(0, comma).trim();
    const country = label.slice(comma + 1).trim();
    if (!city || !country) continue;
    const known = staticByLabel.get(foldPlace(label));
    extras.push(
      known
        ? { ...known, journal: true }
        : entry(city, country, undefined, true),
    );
  }
  return extras;
}

function bucket(place: Entry, query: string): number | null {
  if (
    (place.iata && foldPlace(place.iata) === query) ||
    place.aliases.some((alias) => foldPlace(alias) === query)
  ) {
    return 0;
  }
  if (place.normCity.startsWith(query) || place.normLabel.startsWith(query)) {
    return 1;
  }
  if (
    query.length >= 2 &&
    ((place.iata && foldPlace(place.iata).startsWith(query)) ||
      place.aliases.some((alias) => foldPlace(alias).startsWith(query)))
  ) {
    return 2;
  }
  const words = place.normLabel.split(/[^a-z0-9]+/);
  if (words.some((word) => word.startsWith(query))) return 3;
  if (query.includes(" ") && place.normLabel.includes(query)) return 4;
  return null;
}

export function suggestPlaces(
  query: string,
  journalLabels: readonly string[] = [],
  limit = LIMIT,
): PlaceSuggestion[] {
  const folded = foldPlace(query);
  if (!folded || folded.length > 80) return [];

  const byLabel = new Map<string, Entry>();
  for (const place of STATIC_PLACES) byLabel.set(place.normLabel, place);
  for (const place of journalEntries(journalLabels)) {
    byLabel.set(place.normLabel, place);
  }

  return [...byLabel.values()]
    .flatMap((place) => {
      const rank = bucket(place, folded);
      return rank === null ? [] : [{ place, rank }];
    })
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.place.journal !== b.place.journal) return a.place.journal ? -1 : 1;
      return a.place.label.localeCompare(b.place.label);
    })
    .slice(0, limit)
    .map(({ place }) => ({
      label: place.label,
      journal: place.journal,
      iata: place.iata,
    }));
}
