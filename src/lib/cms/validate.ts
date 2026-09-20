import { destinationSlugs } from "@/data/destinations";
import { getGuideHubSlugs } from "@/data/guides";
import type { FeaturedImage, Post, PostMeta } from "@/lib/post-types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_DESTINATIONS = new Set(destinationSlugs);
const ALLOWED_GUIDE_HUBS = new Set(getGuideHubSlugs());

export type PostInput = {
  title?: unknown;
  slug?: unknown;
  date?: unknown;
  excerpt?: unknown;
  contentHtml?: unknown;
  featuredImageUrl?: unknown;
  featuredImageAlt?: unknown;
  destinations?: unknown;
  guideHubs?: unknown;
};

export type ValidatedPost = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  contentHtml: string;
  featuredImage: FeaturedImage | null;
  destinations: string[];
  guideHubs: string[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((d) => asString(d)).filter(Boolean);
  }
  if (typeof value === "string" && value) {
    return value
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return [];
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

  const destinations = asStringArray(input.destinations);
  for (const d of destinations) {
    if (!ALLOWED_DESTINATIONS.has(d)) {
      return { ok: false, error: `Unknown destination slug: ${d}` };
    }
  }

  const guideHubs = asStringArray(input.guideHubs);
  for (const h of guideHubs) {
    if (!ALLOWED_GUIDE_HUBS.has(h)) {
      return { ok: false, error: `Unknown guide hub slug: ${h}` };
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
      guideHubs,
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
    ...(data.guideHubs.length > 0 ? { guideHubs: data.guideHubs } : {}),
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
    ...(data.guideHubs.length > 0 ? { guideHubs: data.guideHubs } : {}),
  };
}
