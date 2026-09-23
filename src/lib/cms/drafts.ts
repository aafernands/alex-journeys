import fs from "node:fs";
import path from "node:path";
import type { FeaturedImage, PostBookingTool, PostItinerary } from "@/lib/post-types";

export type DraftPost = {
  slug: string;
  title: string;
  date: string;
  status?: "draft";
  excerpt: string;
  featuredImage: FeaturedImage | null;
  destinations: string[];
  guideHubs?: string[];
  bookingTools?: PostBookingTool[];
  experienceWidgetHtml?: string;
  contentHtml: string;
  itinerary?: PostItinerary;
  source?: unknown;
};

const DRAFTS_DIR = path.join(process.cwd(), "src/content/drafts");

export function getAllDrafts(): DraftPost[] {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  const files = fs
    .readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const drafts: DraftPost[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DRAFTS_DIR, file), "utf8");
      const data = JSON.parse(raw) as DraftPost;
      if (data?.slug && data?.title) drafts.push(data);
    } catch {
      // skip corrupt draft files
    }
  }
  return drafts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getDraftBySlug(slug: string): DraftPost | null {
  const file = path.join(DRAFTS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as DraftPost;
}
