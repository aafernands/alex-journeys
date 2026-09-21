import { destinationSlugs } from "@/data/destinations";
import { getGuideHubSlugs } from "@/data/guides";
import type {
  FeaturedImage,
  Post,
  PostItinerary,
  PostItineraryBlock,
  PostItineraryDay,
  PostMeta,
} from "@/lib/post-types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_DESTINATIONS = new Set(destinationSlugs);
const ALLOWED_GUIDE_HUBS = new Set(getGuideHubSlugs());

const MAX_ITINERARY_DAYS = 21;
const MAX_BLOCKS_PER_DAY = 24;

export type PostInput = {
  title?: unknown;
  slug?: unknown;
  date?: unknown;
  /** Ignored on write; GitHub publish stamps `updatedAt` server-side. */
  updatedAt?: unknown;
  excerpt?: unknown;
  contentHtml?: unknown;
  featuredImageUrl?: unknown;
  featuredImageAlt?: unknown;
  destinations?: unknown;
  guideHubs?: unknown;
  itinerary?: unknown;
};

export type ValidatedPost = {
  title: string;
  slug: string;
  date: string;
  /** Set by the GitHub write path on Update & publish; optional on first publish. */
  updatedAt?: string;
  excerpt: string;
  contentHtml: string;
  featuredImage: FeaturedImage | null;
  destinations: string[];
  guideHubs: string[];
  /** Present only when enabled with at least one day. */
  itinerary?: PostItinerary;
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

function makeId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
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

function validateItinerary(
  raw: unknown,
):
  | { ok: true; data: PostItinerary | undefined }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, data: undefined };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Itinerary must be an object." };
  }

  const input = raw as Record<string, unknown>;
  const enabled = Boolean(input.enabled);

  if (!enabled) {
    return { ok: true, data: undefined };
  }

  const title = asString(input.title);
  if (title.length > 160) {
    return {
      ok: false,
      error: "Itinerary title must be at most 160 characters.",
    };
  }

  const intro = asString(input.intro);
  if (intro.length > 800) {
    return {
      ok: false,
      error: "Itinerary intro must be at most 800 characters.",
    };
  }

  if (!Array.isArray(input.days)) {
    return { ok: false, error: "Itinerary days must be an array." };
  }
  if (input.days.length > MAX_ITINERARY_DAYS) {
    return {
      ok: false,
      error: `Itinerary supports at most ${MAX_ITINERARY_DAYS} days.`,
    };
  }

  const days: PostItineraryDay[] = [];
  for (let i = 0; i < input.days.length; i++) {
    const dayRaw = input.days[i];
    if (typeof dayRaw !== "object" || dayRaw === null || Array.isArray(dayRaw)) {
      return { ok: false, error: `Itinerary day ${i + 1} must be an object.` };
    }
    const d = dayRaw as Record<string, unknown>;
    const label = asString(d.label) || `Day ${i + 1}`;
    const dayTitle = asString(d.title);
    const summary = asString(d.summary);
    const id = asString(d.id) || makeId("day", i);

    if (label.length > 40) {
      return {
        ok: false,
        error: `Itinerary day ${i + 1} label must be at most 40 characters.`,
      };
    }
    if (dayTitle.length > 160) {
      return {
        ok: false,
        error: `Itinerary day ${i + 1} title must be at most 160 characters.`,
      };
    }
    if (summary.length > 400) {
      return {
        ok: false,
        error: `Itinerary day ${i + 1} summary must be at most 400 characters.`,
      };
    }

    if (!Array.isArray(d.blocks)) {
      return {
        ok: false,
        error: `Itinerary day ${i + 1} blocks must be an array.`,
      };
    }
    if (d.blocks.length > MAX_BLOCKS_PER_DAY) {
      return {
        ok: false,
        error: `Itinerary day ${i + 1} supports at most ${MAX_BLOCKS_PER_DAY} blocks.`,
      };
    }

    const blocks: PostItineraryBlock[] = [];
    for (let j = 0; j < d.blocks.length; j++) {
      const blockRaw = d.blocks[j];
      if (
        typeof blockRaw !== "object" ||
        blockRaw === null ||
        Array.isArray(blockRaw)
      ) {
        return {
          ok: false,
          error: `Itinerary day ${i + 1} block ${j + 1} must be an object.`,
        };
      }
      const b = blockRaw as Record<string, unknown>;
      const body = asString(b.body);
      if (!body) continue;

      const time = asString(b.time);
      const place = asString(b.place);
      if (time.length > 40) {
        return {
          ok: false,
          error: `Itinerary day ${i + 1} block ${j + 1} time is too long.`,
        };
      }
      if (place.length > 120) {
        return {
          ok: false,
          error: `Itinerary day ${i + 1} block ${j + 1} place is too long.`,
        };
      }
      if (body.length > 2000) {
        return {
          ok: false,
          error: `Itinerary day ${i + 1} block ${j + 1} body is too long.`,
        };
      }

      blocks.push({
        id: asString(b.id) || makeId(`day${i + 1}-block`, j),
        ...(time ? { time } : {}),
        ...(place ? { place } : {}),
        body,
      });
    }

    // Keep days that have a title or at least one block
    if (!dayTitle && blocks.length === 0) continue;

    days.push({
      id,
      label,
      title: dayTitle || label,
      ...(summary ? { summary } : {}),
      blocks,
    });
  }

  if (days.length === 0) {
    return { ok: true, data: undefined };
  }

  const itinerary: PostItinerary = {
    enabled: true,
    ...(title ? { title } : {}),
    ...(intro ? { intro } : {}),
    days,
  };

  return { ok: true, data: itinerary };
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

  const updatedAtRaw = asString(input.updatedAt);
  if (updatedAtRaw && Number.isNaN(Date.parse(updatedAtRaw))) {
    return { ok: false, error: "Invalid updatedAt." };
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
    // Media library returns site-relative paths (/media/...); remote URLs must be http(s).
    const isSitePath =
      imageUrl.startsWith("/") &&
      !imageUrl.startsWith("//") &&
      !imageUrl.includes("\\") &&
      imageUrl.length <= 500;
    if (isSitePath) {
      featuredImage = { url: imageUrl, alt: imageAlt };
    } else {
      try {
        const u = new URL(imageUrl);
        if (u.protocol !== "https:" && u.protocol !== "http:") {
          return { ok: false, error: "Featured image URL must be http(s)." };
        }
        featuredImage = { url: imageUrl, alt: imageAlt };
      } catch {
        return {
          ok: false,
          error:
            "Featured image URL is invalid. Use a library image (/media/...) or a full http(s) link.",
        };
      }
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

  const itineraryResult = validateItinerary(input.itinerary);
  if (!itineraryResult.ok) return itineraryResult;

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
      ...(itineraryResult.data ? { itinerary: itineraryResult.data } : {}),
    },
  };
}

export function toPostJson(data: ValidatedPost): Post {
  return {
    title: data.title,
    slug: data.slug,
    date: data.date,
    ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
    excerpt: data.excerpt,
    featuredImage: data.featuredImage,
    destinations: data.destinations,
    ...(data.guideHubs.length > 0 ? { guideHubs: data.guideHubs } : {}),
    contentHtml: data.contentHtml,
    source: "cms",
    ...(data.itinerary ? { itinerary: data.itinerary } : {}),
  };
}

export function toPostMeta(data: ValidatedPost): PostMeta {
  return {
    title: data.title,
    slug: data.slug,
    date: data.date,
    ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
    excerpt: data.excerpt,
    featuredImage: data.featuredImage,
    destinations: data.destinations,
    ...(data.guideHubs.length > 0 ? { guideHubs: data.guideHubs } : {}),
  };
}
