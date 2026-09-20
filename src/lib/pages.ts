import fs from "node:fs";
import path from "node:path";

export type SitePage = {
  slug: string;
  title: string;
  description: string;
  /** Optional eyebrow label above the H1 */
  label?: string;
  contentHtml: string;
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

/** Marketing / hub routes that are React code only (not JSON-editable). */
export const CODE_ONLY_PAGE_ROUTES = [
  { path: "/", note: "Homepage (hero via CMS → Website design)" },
  { path: "/about", note: "About (React)" },
  { path: "/contact", note: "Contact form (React)" },
  { path: "/start-here", note: "Start here hub (React)" },
  { path: "/bucket-list", note: "Bucket list (React)" },
  { path: "/guides", note: "Guides hub (React)" },
  { path: "/tools", note: "Tools hub (React)" },
  { path: "/media-kit", note: "Media kit (React)" },
  { path: "/destinations", note: "Destinations index (data-driven tree)" },
  { path: "/blog", note: "Blog index (posts JSON)" },
  { path: "/search", note: "Search (React)" },
  { path: "/account", note: "Reader account dashboard (profile + saves)" },
  { path: "/app", note: "OAuth app purpose (Google branding)" },
] as const;

/** Public path for a CMS content page slug. */
export function cmsPagePublicPath(slug: string): string {
  return `/${slug}`;
}

export function getPageBySlug(slug: string): SitePage | null {
  const file = path.join(PAGES_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as SitePage;
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
