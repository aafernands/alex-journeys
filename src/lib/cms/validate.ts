import { destinationSlugs } from "@/data/destinations";
import type { FeaturedImage, Post, PostMeta } from "@/lib/post-types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_DESTINATIONS = new Set(destinationSlugs);

export type PostInput = {
  title?: unknown;
  slug?: unknown;
  date?: unknown;
  excerpt?: unknown;
  contentHtml?: unknown;
  featuredImageUrl?: unknown;
  featuredImageAlt?: unknown;
  destinations?: unknown;
};

export type ValidatedPost = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  contentHtml: string;
  featuredImage: FeaturedImage | null;
  destinations: string[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Sanitize + validate kebab-case slug; reject path traversal. */
export function sanitizeSlug(raw: unknown): string | null {
  const slug = asString(raw).toLowerCase();
  if (!slug) return null;
  if (
    slug.includes("..") ||
    slug.includes("/") ||
    slug.includes("\\") ||
    slug.includes("\0")
  ) {
    return null;
  }
  if (!SLUG_RE.test(slug)) return null;
  if (slug.length > 120) return null;
  return slug;
}

export function validatePostInput(
  input: PostInput,
): { ok: true; data: ValidatedPost } | { ok: false; error: string } {
  const title = asString(input.title);
  if (!title || title.length > 200) {
    return { ok: false, error: "Title is required (max 200 characters)." };
  }

  const slug = sanitizeSlug(input.slug);
  if (!slug) {
    return {
      ok: false,
      error:
        "Slug must be kebab-case (lowercase letters, numbers, hyphens only).",
    };
  }

  const dateRaw = asString(input.date);
  const date = dateRaw
    ? dateRaw.includes("T")
      ? dateRaw
      : `${dateRaw}T12:00:00`
    : new Date().toISOString().slice(0, 19);
  if (Number.isNaN(Date.parse(date))) {
    return { ok: false, error: "Invalid date." };
  }

  const excerpt = asString(input.excerpt);
  if (!excerpt || excerpt.length > 600) {
    return { ok: false, error: "Excerpt is required (max 600 characters)." };
  }

  const contentHtml = asString(input.contentHtml);
  if (!contentHtml) {
    return { ok: false, error: "Content HTML is required." };
  }

  const imageUrl = asString(input.featuredImageUrl);
  const imageAlt = asString(input.featuredImageAlt) || title;
  let featuredImage: FeaturedImage | null = null;
  if (imageUrl) {
    try {
      const u = new URL(imageUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        return { ok: false, error: "Featured image URL must be http(s)." };
      }
      featuredImage = { url: imageUrl, alt: imageAlt };
    } catch {
      return { ok: false, error: "Featured image URL is invalid." };
    }
  }

  let destinations: string[] = [];
  if (Array.isArray(input.destinations)) {
    destinations = input.destinations
      .map((d) => asString(d))
      .filter(Boolean);
  } else if (typeof input.destinations === "string" && input.destinations) {
    destinations = input.destinations
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  for (const d of destinations) {
    if (!ALLOWED_DESTINATIONS.has(d)) {
      return { ok: false, error: `Unknown destination slug: ${d}` };
    }
  }

  return {
    ok: true,
    data: {
      title,
      slug,
      date,
      excerpt,
      contentHtml,
      featuredImage,
      destinations,
    },
  };
}

export function toPostJson(data: ValidatedPost): Post {
  return {
    title: data.title,
    slug: data.slug,
    date: data.date,
    excerpt: data.excerpt,
    featuredImage: data.featuredImage,
    destinations: data.destinations,
    contentHtml: data.contentHtml,
    source: "cms",
  };
}

export function toPostMeta(data: ValidatedPost): PostMeta {
  return {
    title: data.title,
    slug: data.slug,
    date: data.date,
    excerpt: data.excerpt,
    featuredImage: data.featuredImage,
    destinations: data.destinations,
  };
}
