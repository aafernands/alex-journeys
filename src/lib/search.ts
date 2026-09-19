/**
 * Client-safe search types and matching — no Node fs.
 * Index is built server-side in search-index.ts and passed as props.
 */

export type SearchType = "story" | "guide" | "place" | "page";

export type SearchItem = {
  id: string;
  type: SearchType;
  title: string;
  slug: string;
  href: string;
  excerpt: string;
  /** Lowercased haystack: title + excerpt + slug */
  haystack: string;
};

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  story: "Stories",
  guide: "Guides",
  place: "Places",
  page: "Pages",
};

/** Display order for grouped results */
export const SEARCH_TYPE_ORDER: SearchType[] = [
  "story",
  "guide",
  "place",
  "page",
];

function normalize(q: string): string[] {
  return q
    .toLowerCase()
    .trim()
    .split(/[\s/,_-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Score a single item against query tokens.
 * Title/slug hits weigh more than excerpt.
 */
function scoreItem(item: SearchItem, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const title = item.title.toLowerCase();
  const slug = item.slug.toLowerCase();
  const excerpt = item.excerpt.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    let hit = false;
    if (title.includes(token)) {
      score += title.startsWith(token) ? 12 : 8;
      hit = true;
    }
    if (slug.includes(token)) {
      score += 6;
      hit = true;
    }
    if (excerpt.includes(token)) {
      score += 3;
      hit = true;
    }
    if (!hit && item.haystack.includes(token)) {
      score += 1;
      hit = true;
    }
    if (!hit) return 0; // require all tokens
  }
  return score;
}

export function searchItems(
  query: string,
  index: SearchItem[],
): SearchItem[] {
  const tokens = normalize(query);
  if (tokens.length === 0) return [];

  const scored = index
    .map((item) => ({ item, score: scoreItem(item, tokens) }))
    .filter((s) => s.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.title.localeCompare(b.item.title);
  });

  return scored.map((s) => s.item);
}

export type GroupedResults = {
  type: SearchType;
  label: string;
  items: SearchItem[];
};

export function groupSearchResults(items: SearchItem[]): GroupedResults[] {
  const byType = new Map<SearchType, SearchItem[]>();
  for (const item of items) {
    const list = byType.get(item.type) ?? [];
    list.push(item);
    byType.set(item.type, list);
  }
  return SEARCH_TYPE_ORDER.filter((t) => byType.has(t)).map((type) => ({
    type,
    label: SEARCH_TYPE_LABELS[type],
    items: byType.get(type)!,
  }));
}

/** Short snippet for result cards — prefer start of excerpt. */
export function snippetFor(item: SearchItem, maxLen = 140): string {
  const text = item.excerpt.replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).replace(/\s+\S*$/, "")}…`;
}
