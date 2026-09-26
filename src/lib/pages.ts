import fs from "node:fs";
import path from "node:path";

export type SitePage = {
  slug: string;
  title: string;
  description: string;
  /** Optional eyebrow label above the H1 */
  label?: string;
  contentHtml: string;
  /**
   * Optional structured sections for hubs, forms, and complex layouts.
   * Shape is page-specific; routes read known keys with fallbacks.
   */
  sections?: Record<string, unknown>;
  source?: {
    site: string;
    url: string;
    wpId: number;
    wpSlug: string;
  };
};

type PagesIndex = {
  pages?: string[];
  hubs?: string[];
  skipped?: unknown[];
};

const PAGES_DIR = path.join(process.cwd(), "src/content/pages");

/**
 * True app / auth / system routes — not JSON-editable as marketing pages.
 * Content hubs (about, contact, guides intros, etc.) are CMS pages.
 */
export const CODE_ONLY_PAGE_ROUTES = [
  { path: "/account", note: "Reader account dashboard (profile + saves)" },
  { path: "/premium", note: "Premium membership" },
  { path: "/login", note: "Reader / admin sign-in" },
  { path: "/forgot-password", note: "Password reset request" },
  { path: "/reset-password", note: "Password reset form" },
  { path: "/search", note: "Site search UI (indexes posts/pages)" },
  { path: "/cms/*", note: "Admin console (gated)" },
  { path: "/api/*", note: "API routes (auth, CMS, newsletter, saves)" },
] as const;

/** Public path for a CMS content page slug. */
export function cmsPagePublicPath(slug: string): string {
  return `/${slug}`;
}

export function getPageBySlug(slug: string): SitePage | null {
  const file = path.join(PAGES_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as SitePage;
  } catch {
    return null;
  }
}

/**
 * Load a CMS page, merging with fallback defaults so builds never blank
 * if a JSON file is missing or incomplete.
 */
export function getPageWithFallback(
  slug: string,
  fallback: SitePage,
): SitePage {
  const page = getPageBySlug(slug);
  if (!page) return { ...fallback, slug };
  return {
    ...fallback,
    ...page,
    slug,
    title: page.title?.trim() || fallback.title,
    description: page.description?.trim() || fallback.description,
    label: page.label?.trim() || fallback.label,
    contentHtml:
      typeof page.contentHtml === "string" && page.contentHtml.trim()
        ? page.contentHtml
        : fallback.contentHtml,
    sections: {
      ...(fallback.sections ?? {}),
      ...(page.sections && typeof page.sections === "object"
        ? page.sections
        : {}),
    },
    source: page.source ?? fallback.source,
  };
}

function readIndex(): PagesIndex {
  const indexPath = path.join(PAGES_DIR, "_index.json");
  if (!fs.existsSync(indexPath)) return { pages: [] };
  return JSON.parse(fs.readFileSync(indexPath, "utf8")) as PagesIndex;
}

/** All CMS-editable pages from src/content/pages (excludes _index). */
export function getAllCmsPages(): SitePage[] {
  if (!fs.existsSync(PAGES_DIR)) return [];
  const index = readIndex();
  const fromIndex = index.pages ?? [];
  const files = fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => f.replace(/\.json$/, ""));

  const slugs = [...new Set([...fromIndex, ...files])];
  const pages: SitePage[] = [];
  for (const slug of slugs) {
    const page = getPageBySlug(slug);
    if (page) pages.push(page);
  }
  return pages.sort((a, b) => a.title.localeCompare(b.title));
}

/** Slugs that already have an explicit App Router page under src/app/{slug}. */
export const EXPLICIT_CMS_PAGE_SLUGS = [
  "about",
  "contact",
  "start-here",
  "media-kit",
  "app",
  "guides",
  "tools",
  "destinations",
  "blog",
  "policies",
  "privacy",
  "terms",
  "affiliate-disclosure",
] as const;
