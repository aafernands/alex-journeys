import fs from "node:fs";
import path from "node:path";

export type FeaturedImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  featuredImage: FeaturedImage | null;
  destinations: string[];
};

export type Post = PostMeta & {
  contentHtml: string;
  source: {
    site: string;
    url: string;
    wpId: number;
  };
};

type PostsIndex = {
  count: number;
  featuredHomepage: string[];
  posts: PostMeta[];
};

const POSTS_DIR = path.join(process.cwd(), "src/content/posts");

function readIndex(): PostsIndex {
  const raw = fs.readFileSync(path.join(POSTS_DIR, "_index.json"), "utf8");
  return JSON.parse(raw) as PostsIndex;
}

export function getAllPosts(): PostMeta[] {
  return readIndex().posts;
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}

export function getPostBySlug(slug: string): Post | null {
  const file = path.join(POSTS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Post;
}

export function getFeaturedPosts(): PostMeta[] {
  const index = readIndex();
  const bySlug = new Map(index.posts.map((p) => [p.slug, p]));
  return index.featuredHomepage
    .map((slug) => bySlug.get(slug))
    .filter((p): p is PostMeta => Boolean(p));
}

export function getPostsByDestination(destinationSlug: string): PostMeta[] {
  return getAllPosts().filter((p) =>
    p.destinations.includes(destinationSlug),
  );
}

export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export function formatPostDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "this",
  "that",
  "into",
  "over",
  "travel",
  "guide",
  "tips",
  "best",
  "days",
  "week",
  "trip",
  "next",
  "how",
  "what",
  "when",
  "where",
]);

function tokenize(...parts: string[]): string[] {
  const out = new Set<string>();
  for (const part of parts) {
    for (const raw of part.toLowerCase().split(/[^a-z0-9]+/)) {
      if (raw.length < 3 || STOP.has(raw)) continue;
      out.add(raw);
    }
  }
  return [...out];
}

/** Newest post by date (index is already newest-first). */
export function getLatestPost(): PostMeta | null {
  const posts = getAllPosts();
  return posts[0] ?? null;
}

/**
 * Related posts: prefer shared destinations, then title/slug keyword overlap,
 * else fall back to recent posts.
 */
export function getRelatedPosts(slug: string, limit = 3): PostMeta[] {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === slug);
  const others = all.filter((p) => p.slug !== slug);
  if (!current) return others.slice(0, limit);

  const currentTokens = new Set(
    tokenize(current.title, current.slug, ...current.destinations),
  );

  const scored = others.map((p) => {
    let score = 0;
    for (const d of p.destinations) {
      if (current.destinations.includes(d)) score += 10;
    }
    for (const token of tokenize(p.title, p.slug, ...p.destinations)) {
      if (currentTokens.has(token)) score += 2;
    }
    return { post: p, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.post.date).getTime() - new Date(a.post.date).getTime();
  });

  return scored.slice(0, limit).map((s) => s.post);
}
