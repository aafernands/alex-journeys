/**
 * Match a trip destination to journal posts the site already has.
 * Safe in client components (no filesystem).
 */
import { foldPlace } from "@/lib/place-suggestions";

export type JournalPlace = {
  slug: string;
  name: string;
  city: string;
};

export type JournalNote = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  destinations: string[];
};

function words(value: string): string[] {
  return foldPlace(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function placeMatches(place: JournalPlace, query: string, tokens: Set<string>): boolean {
  const name = foldPlace(place.name);
  const city = foldPlace(place.city);
  const nameWords = words(place.name);
  const cityWords = words(place.city);
  const named =
    name.length >= 3 &&
    (tokens.has(name) || query.includes(name) || nameWords.every((word) => tokens.has(word)));
  const cityHit =
    city.length >= 3 &&
    city !== name &&
    (tokens.has(city) || query.includes(city) || cityWords.every((word) => tokens.has(word)));
  return named || cityHit;
}

/** Up to four existing posts for this destination. No fallback to unrelated stories. */
export function journalNotesForDestination(
  notes: readonly JournalNote[],
  places: readonly JournalPlace[],
  destination: string,
  limit = 4,
): JournalNote[] {
  const query = foldPlace(destination);
  const tokens = new Set(words(destination));
  if (tokens.size === 0) return [];

  const matchedSlugs = new Set(
    places.filter((place) => placeMatches(place, query, tokens)).map((place) => place.slug),
  );

  const scored = notes.map((note) => {
    let score = 0;
    for (const slug of note.destinations) {
      if (matchedSlugs.has(slug)) score += 10;
    }
    const title = foldPlace(`${note.title} ${note.slug.replace(/-/g, " ")}`);
    for (const token of tokens) {
      if (token.length < 4) continue;
      if (new RegExp(`\\b${token}\\b`).test(title)) score += 4;
    }
    return { note, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.note.date.localeCompare(a.note.date))
    .slice(0, Math.max(1, Math.min(4, limit)))
    .map((entry) => entry.note);
}
