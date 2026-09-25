import { destinationSlugs } from "@/data/destinations";
import { getGuideHubSlugs } from "@/data/guides";
import { getPostSlugs } from "@/lib/posts";
import type { SeoLinkCatalog } from "@/lib/seo-audit";

/** Slugs the checklist treats as real internal links. Server-only (reads posts). */
export function getSeoLinkCatalog(): SeoLinkCatalog {
  return {
    postSlugs: getPostSlugs(),
    destinationSlugs: [...destinationSlugs],
    guideSlugs: getGuideHubSlugs(),
  };
}
