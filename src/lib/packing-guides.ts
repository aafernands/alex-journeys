/**
 * Packing stories already on the journal. Matches title, slug, excerpt,
 * and guide-hub tags. A passing mention in a destination story does not qualify.
 */
export type PackingGuideTopic = "packing" | "tech";

export type PackingGuideInput = {
  slug: string;
  title: string;
  excerpt: string;
  date?: string;
  guideHubs?: string[];
  featuredImage?: { url: string; alt: string } | null;
};

export type PackingGuide = {
  slug: string;
  title: string;
  excerpt: string;
  href: string;
  imageUrl: string | null;
  imageAlt: string;
  topics: PackingGuideTopic[];
};

const PACKING_WORD = /\bpacking\b|\bluggage\b|\bcarry-?on\b/i;
const TECH_WORD = /\bgadgets?\b|\btravel[- ]tech\b/i;

export function matchPackingGuide(post: PackingGuideInput): PackingGuide | null {
  const hubs = post.guideHubs ?? [];
  const text = `${post.title}\n${post.slug.replace(/-/g, " ")}\n${post.excerpt}`;
  const packing = hubs.includes("pack-gear") || PACKING_WORD.test(text);
  const tech = TECH_WORD.test(text) || /travel-tech/.test(post.slug);
  if (!packing && !tech) return null;
  const topics: PackingGuideTopic[] = [];
  if (packing) topics.push("packing");
  if (tech) topics.push("tech");
  const excerpt = post.excerpt.replace(/\s+/g, " ").trim();
  return {
    slug: post.slug,
    title: post.title.replace(/\s+/g, " ").trim(),
    excerpt,
    href: `/${post.slug}`,
    imageUrl: post.featuredImage?.url?.trim() || null,
    imageAlt: post.featuredImage?.alt?.trim() || post.title,
    topics,
  };
}

/** Newest packing note first, then gadget notes. */
export function collectPackingGuides(posts: readonly PackingGuideInput[]): PackingGuide[] {
  return posts
    .map((post) => ({ post, guide: matchPackingGuide(post) }))
    .filter((entry): entry is { post: PackingGuideInput; guide: PackingGuide } =>
      Boolean(entry.guide),
    )
    .sort((a, b) => {
      const techA = a.guide.topics.includes("tech") && !a.guide.topics.includes("packing");
      const techB = b.guide.topics.includes("tech") && !b.guide.topics.includes("packing");
      if (techA !== techB) return techA ? 1 : -1;
      const dateA = Date.parse(a.post.date ?? "") || 0;
      const dateB = Date.parse(b.post.date ?? "") || 0;
      return dateB - dateA;
    })
    .map((entry) => entry.guide);
}

export function guideForTopic(
  guides: readonly PackingGuide[],
  topic: PackingGuideTopic,
): PackingGuide | null {
  return guides.find((guide) => guide.topics.includes(topic)) ?? null;
}
