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
