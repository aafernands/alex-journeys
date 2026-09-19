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

const PAGES_DIR = path.join(process.cwd(), "src/content/pages");

export function getPageBySlug(slug: string): SitePage | null {
  const file = path.join(PAGES_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as SitePage;
}
