import { getAllDestinations } from "@/data/destinations";
import { guideHubs } from "@/data/guides";
import { getAllPosts } from "@/lib/posts";
import type { SearchItem } from "@/lib/search";

const STATIC_PAGES: Omit<SearchItem, "haystack" | "id">[] = [
  {
    type: "page",
    title: "About",
    slug: "about",
    href: "/about",
    excerpt:
      "Meet Alex Fernandes — the traveler behind Fernandes Journeys, a personal trip journal of places already visited.",
  },
  {
    type: "page",
    title: "Start Here",
    slug: "start-here",
    href: "/start-here",
    excerpt:
      "New to Fernandes Journeys? Start with Places, Stories, Guides, and Tools from this personal travel journal.",
  },
  {
    type: "page",
    title: "Tools I use",
    slug: "tools",
    href: "/tools",
    excerpt:
      "Affiliate tools I actually use when planning trips — stays, flights, insurance, money, and connectivity.",
  },
  {
    type: "page",
    title: "Contact",
    slug: "contact",
    href: "/contact",
    excerpt:
      "Get in touch with Alex — trip notes, collaborations, or a friendly hello from the road.",
  },
];

function withHaystack(
  partial: Omit<SearchItem, "haystack" | "id"> & { id?: string },
): SearchItem {
  const haystack = [partial.title, partial.excerpt, partial.slug]
    .join(" ")
    .toLowerCase();
  return {
    id: partial.id ?? `${partial.type}:${partial.slug}`,
    type: partial.type,
    title: partial.title,
    slug: partial.slug,
    href: partial.href,
    excerpt: partial.excerpt,
    haystack,
  };
}

/**
 * Build-time search index from existing content data.
 * Uses post excerpts from the index — does not modify post HTML bodies.
 */
export function getSearchIndex(): SearchItem[] {
  const stories = getAllPosts().map((p) =>
    withHaystack({
      type: "story",
      title: p.title,
      slug: p.slug,
      href: `/blog/${p.slug}`,
      excerpt: p.excerpt || "",
    }),
  );

  const guides = guideHubs.map((h) =>
    withHaystack({
      type: "guide",
      title: h.title,
      slug: h.slug,
      href: `/guides/${h.slug}`,
      excerpt: h.description,
    }),
  );

  const places = getAllDestinations().map((d) =>
    withHaystack({
      type: "place",
      title: d.name,
      slug: d.slug,
      href: `/destinations/${d.slug}`,
      excerpt: d.blurb,
    }),
  );

  const pages = STATIC_PAGES.map((p) => withHaystack(p));

  return [...stories, ...guides, ...places, ...pages];
}
