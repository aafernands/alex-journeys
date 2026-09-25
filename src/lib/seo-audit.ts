import {
  SEO_DESCRIPTION_TARGET,
  SEO_TITLE_TARGET,
} from "@/lib/post-seo";

export type SeoCheckStatus = "pass" | "warn" | "fail";

export type SeoCheck = {
  id: string;
  label: string;
  status: SeoCheckStatus;
  detail: string;
};

export type SeoAudit = {
  score: number;
  checks: SeoCheck[];
  /** Non-passing checks, failures first. */
  issues: string[];
};

export type SeoLinkCatalog = {
  postSlugs: string[];
  destinationSlugs: string[];
  guideSlugs: string[];
};

export type SeoAuditImage = {
  url?: string | null;
  alt?: string | null;
};

export type SeoAuditItinerary = {
  enabled?: boolean;
  title?: string;
  intro?: string;
  days?: {
    label?: string;
    title?: string;
    summary?: string;
    blocks?: { place?: string; body?: string }[];
  }[];
};

export type SeoAuditInput = {
  slug?: string;
  title?: string;
  excerpt?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  contentHtml?: string;
  featuredImage?: SeoAuditImage | null;
  itinerary?: SeoAuditItinerary | null;
};

export type SeoAuditOptions = {
  catalog?: SeoLinkCatalog;
  /** Defaults to the current date. Tests pin this so stale-year checks stay stable. */
  now?: Date;
};

const INTERNAL_HOSTS = new Set([
  "alexjourneys.com",
  "www.alexjourneys.com",
  "fernandesjourneys.com",
  "www.fernandesjourneys.com",
]);

const JUNK_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\[acf[\s-][^\]]*\]/i, label: "unrendered [acf-…] shortcode" },
  { re: /SEO Tips for Yoast/i, label: "“SEO Tips for Yoast”" },
  { re: /In-Content Ads:/i, label: "“In-Content Ads:”" },
  { re: /Test Link/, label: "“Test Link”" },
  { re: /\{ifnull\(/, label: "template fragment {ifnull(" },
  { re: /!\[[^\]]*\]\(/, label: "markdown image fragment" },
  { re: /Instagram emmbbed/i, label: "“Instagram emmbbed”" },
];

const WORD_THIN = 300;
const WORD_TARGET = 600;
const INTRO_WORDS = 20;

type WeightedCheck = SeoCheck & { weight: number };

function effectiveTitle(input: SeoAuditInput): string {
  return input.seoTitle?.trim() || input.title?.trim() || "";
}

function effectiveDescription(input: SeoAuditInput): string {
  return input.seoDescription?.trim() || input.excerpt?.trim() || "";
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "…")
    .replace(/&#8230;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 0 && code < 65536 ? String.fromCharCode(code) : " ";
    });
}

function htmlToText(html: string): string {
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeBasicEntities(stripped).replace(/\s+/g, " ").trim();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function itineraryText(itinerary: SeoAuditItinerary | null | undefined): string {
  if (!itinerary?.enabled) return "";
  const parts: string[] = [];
  if (itinerary.title) parts.push(itinerary.title);
  if (itinerary.intro) parts.push(itinerary.intro);
  for (const day of itinerary.days ?? []) {
    if (day.label) parts.push(day.label);
    if (day.title) parts.push(day.title);
    if (day.summary) parts.push(day.summary);
    for (const block of day.blocks ?? []) {
      if (block.place) parts.push(block.place);
      if (block.body) parts.push(block.body);
    }
  }
  return parts.join(" ");
}

function storyText(input: SeoAuditInput): string {
  return [htmlToText(input.contentHtml ?? ""), itineraryText(input.itinerary)]
    .filter(Boolean)
    .join(" ");
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    "i",
  );
  const match = tag.match(re);
  if (!match) return null;
  return match[1] ?? match[2] ?? "";
}

function contentImages(html: string): { alt: string | null }[] {
  const images: { alt: string | null }[] = [];
  const re = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    images.push({ alt: attr(match[0], "alt") });
  }
  return images;
}

function headingLevels(html: string): number[] {
  const levels: number[] = [];
  const re = /<h([1-6])\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    levels.push(Number(match[1]));
  }
  return levels;
}

function looksLikeFilename(alt: string): boolean {
  const value = alt.trim();
  if (!value) return false;
  if (/\.(jpe?g|png|gif|webp|avif|svg)$/i.test(value)) return true;
  if (/pexels[-_\s]?photo[-_\s]?\d+/i.test(value)) return true;
  if (/[\\/]/.test(value) && /\.(jpe?g|png|gif|webp|avif)/i.test(value)) {
    return true;
  }
  return false;
}

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase().replace(/\s+/g, " ") ===
    b.trim().toLowerCase().replace(/\s+/g, " ");
}

function pastYears(text: string, currentYear: number): number[] {
  const years = new Set<number>();
  for (const match of text.matchAll(/\b(?:19|20)\d{2}\b/g)) {
    const year = Number(match[0]);
    if (year >= 1990 && year < currentYear) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

function normalizePath(pathname: string): string {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    path = pathname;
  }
  path = path.toLowerCase();
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

type LinkKind = "post" | "destination" | "guide";

function classifyHref(
  href: string,
  catalog: SeoLinkCatalog,
  currentSlug: string,
): LinkKind | null {
  const trimmed = href.trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed) ||
    /^javascript:/i.test(trimmed)
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed, "https://www.alexjourneys.com");
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  const relative = trimmed.startsWith("/") && !trimmed.startsWith("//");
  if (!relative && !INTERNAL_HOSTS.has(host)) return null;

  const path = normalizePath(url.pathname);
  const posts = new Set(catalog.postSlugs.map((slug) => slug.toLowerCase()));
  const destinations = new Set(
    catalog.destinationSlugs.map((slug) => slug.toLowerCase()),
  );
  const guides = new Set(catalog.guideSlugs.map((slug) => slug.toLowerCase()));
  const current = currentSlug.toLowerCase();

  if (path === "/guides") return "guide";
  if (path.startsWith("/guides/")) {
    const slug = path.slice("/guides/".length).split("/")[0] ?? "";
    if (slug && guides.has(slug)) return "guide";
    return null;
  }
  if (path === "/destinations") return "destination";
  if (path.startsWith("/destinations/")) {
    const slug = path.slice("/destinations/".length).split("/")[0] ?? "";
    if (slug && destinations.has(slug)) return "destination";
    return null;
  }
  if (path.startsWith("/blog/")) {
    const slug = path.slice("/blog/".length).split("/")[0] ?? "";
    if (slug && slug !== current && posts.has(slug)) return "post";
    return null;
  }

  const slug = path.slice(1).split("/")[0] ?? "";
  if (!slug || slug.includes(".")) return null;
  if (slug !== current && posts.has(slug)) return "post";
  if (destinations.has(slug)) return "destination";
  return null;
}

function countInternalLinks(
  html: string,
  catalog: SeoLinkCatalog,
  currentSlug: string,
): number {
  const re =
    /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi;
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = match[1] ?? match[2] ?? match[3] ?? "";
    if (classifyHref(href, catalog, currentSlug)) count += 1;
  }
  return count;
}

function pseudoHeadings(html: string): string[] {
  const found: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const inner = match[1] ?? "";
    const onlyBold =
      /^\s*<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>\s*(?:<br\s*\/?>\s*)*$/i.exec(
        inner,
      );
    if (!onlyBold) continue;
    const text = htmlToText(onlyBold[2] ?? "");
    const words = countWords(text);
    if (text.length < 2 || text.length > 80 || words < 1 || words > 12) continue;
    if (/[.!?]$/.test(text) && words > 8) continue;
    found.push(text);
  }
  return found;
}

function ellipsisEnding(description: string): string | null {
  const trimmed = description.trim();
  if (/\[&hellip;\]$/i.test(trimmed)) return "[&hellip;]";
  if (/\[…\]$/.test(trimmed)) return "[…]";
  if (/\[&#8230;\]$/i.test(trimmed)) return "[…]";
  return null;
}

function introWordCount(html: string): { words: number; hasHeading: boolean } {
  const match = /<h[1-6]\b/i.exec(html);
  if (!match || match.index === undefined) {
    return { words: countWords(htmlToText(html)), hasHeading: false };
  }
  return {
    words: countWords(htmlToText(html.slice(0, match.index))),
    hasHeading: true,
  };
}

function checkTitle(title: string): WeightedCheck {
  if (!title) {
    return {
      id: "seo-title",
      label: "SEO title",
      status: "fail",
      detail: "Add an SEO title, or a post title to fall back to.",
      weight: 10,
    };
  }
  if (title.length > SEO_TITLE_TARGET) {
    return {
      id: "seo-title",
      label: "SEO title",
      status: "warn",
      detail: `SEO title is ${title.length} characters. Target about ${SEO_TITLE_TARGET} so it is less likely to be cut off.`,
      weight: 10,
    };
  }
  return {
    id: "seo-title",
    label: "SEO title",
    status: "pass",
    detail: `SEO title is ${title.length} characters (target ~${SEO_TITLE_TARGET}).`,
    weight: 10,
  };
}

function checkDescription(description: string): WeightedCheck {
  if (!description) {
    return {
      id: "meta-description",
      label: "Meta description",
      status: "fail",
      detail: "Add a meta description, or an excerpt to fall back to.",
      weight: 10,
    };
  }
  if (description.length > SEO_DESCRIPTION_TARGET) {
    return {
      id: "meta-description",
      label: "Meta description",
      status: "warn",
      detail: `Meta description is ${description.length} characters. Target about ${SEO_DESCRIPTION_TARGET}.`,
      weight: 10,
    };
  }
  return {
    id: "meta-description",
    label: "Meta description",
    status: "pass",
    detail: `Meta description is ${description.length} characters (target ~${SEO_DESCRIPTION_TARGET}).`,
    weight: 10,
  };
}

function checkEllipsis(description: string): WeightedCheck {
  const ending = description ? ellipsisEnding(description) : null;
  if (ending) {
    return {
      id: "description-ellipsis",
      label: "Description ending",
      status: "fail",
      detail: `Meta description ends with ${ending}, which reads like a truncated excerpt.`,
      weight: 8,
    };
  }
  return {
    id: "description-ellipsis",
    label: "Description ending",
    status: "pass",
    detail: "Meta description does not end with a truncated ellipsis.",
    weight: 8,
  };
}

function checkImageAlt(html: string): WeightedCheck {
  const images = contentImages(html);
  const missing = images.filter((image) => !image.alt?.trim()).length;
  if (missing > 0) {
    return {
      id: "image-alt",
      label: "Image alt text",
      status: "fail",
      detail:
        missing === 1
          ? "1 image has no alt text."
          : `${missing} images have no alt text.`,
      weight: 10,
    };
  }
  return {
    id: "image-alt",
    label: "Image alt text",
    status: "pass",
    detail:
      images.length === 0
        ? "No images in the story body."
        : "Story images have alt text.",
    weight: 10,
  };
}

function checkHeroAlt(
  image: SeoAuditImage | null | undefined,
  title: string,
  seoTitle: string,
): WeightedCheck | null {
  const url = image?.url?.trim() ?? "";
  if (!url) return null;
  const alt = image?.alt?.trim() ?? "";
  if (!alt) {
    return {
      id: "hero-alt",
      label: "Featured image alt",
      status: "fail",
      detail: "Featured image has no alt text.",
      weight: 8,
    };
  }
  if (looksLikeFilename(alt)) {
    return {
      id: "hero-alt",
      label: "Featured image alt",
      status: "fail",
      detail: `Featured image alt looks like a file name (“${alt}”).`,
      weight: 8,
    };
  }
  if ((title && sameText(alt, title)) || (seoTitle && sameText(alt, seoTitle))) {
    return {
      id: "hero-alt",
      label: "Featured image alt",
      status: "warn",
      detail: "Featured image alt repeats the post title. Describe the photo instead.",
      weight: 8,
    };
  }
  return {
    id: "hero-alt",
    label: "Featured image alt",
    status: "pass",
    detail: "Featured image alt describes the photo.",
    weight: 8,
  };
}

function checkIntro(html: string): WeightedCheck {
  const intro = introWordCount(html);
  if (!intro.hasHeading) {
    return {
      id: "intro",
      label: "Intro before headings",
      status: "pass",
      detail: "No heading in the body yet.",
      weight: 8,
    };
  }
  if (intro.words === 0) {
    return {
      id: "intro",
      label: "Intro before headings",
      status: "fail",
      detail: "No intro text before the first heading.",
      weight: 8,
    };
  }
  if (intro.words < INTRO_WORDS) {
    return {
      id: "intro",
      label: "Intro before headings",
      status: "warn",
      detail: `Only ${intro.words} words before the first heading. Open with a short intro.`,
      weight: 8,
    };
  }
  return {
    id: "intro",
    label: "Intro before headings",
    status: "pass",
    detail: "Intro text comes before the first heading.",
    weight: 8,
  };
}

function checkH2(levels: number[]): WeightedCheck {
  if (!levels.includes(2)) {
    return {
      id: "headings-h2",
      label: "H2 headings",
      status: "fail",
      detail: "No H2 headings. The page title is the H1, so sections should use H2.",
      weight: 8,
    };
  }
  return {
    id: "headings-h2",
    label: "H2 headings",
    status: "pass",
    detail: "The story uses H2 headings.",
    weight: 8,
  };
}

function checkHierarchy(levels: number[]): WeightedCheck {
  const skips: string[] = [];
  for (let i = 1; i < levels.length; i += 1) {
    const prev = levels[i - 1]!;
    const next = levels[i]!;
    if (next > prev + 1) {
      skips.push(`H${next} follows H${prev}`);
    }
  }
  const hasH1 = levels.includes(1);
  if (skips.length > 0) {
    const unique = [...new Set(skips)];
    return {
      id: "headings-hierarchy",
      label: "Heading hierarchy",
      status: "fail",
      detail: `Heading level skips: ${unique.join("; ")}.`,
      weight: 8,
    };
  }
  if (hasH1) {
    return {
      id: "headings-hierarchy",
      label: "Heading hierarchy",
      status: "warn",
      detail: "The story body includes an H1. The page title is already the H1.",
      weight: 8,
    };
  }
  return {
    id: "headings-hierarchy",
    label: "Heading hierarchy",
    status: "pass",
    detail: "Heading levels do not skip.",
    weight: 8,
  };
}

function checkPseudoHeadings(html: string): WeightedCheck {
  const found = pseudoHeadings(html);
  if (found.length === 0) {
    return {
      id: "pseudo-headings",
      label: "Bold as headings",
      status: "pass",
      detail: "No bold paragraphs standing in for headings.",
      weight: 4,
    };
  }
  const sample = found.slice(0, 2).map((text) => `“${text}”`).join(", ");
  return {
    id: "pseudo-headings",
    label: "Bold as headings",
    status: "warn",
    detail: `Bold paragraphs are used like headings (${sample}). A real heading is easier to scan.`,
    weight: 4,
  };
}

function checkInternalLinks(
  html: string,
  catalog: SeoLinkCatalog,
  slug: string,
): WeightedCheck {
  const count = countInternalLinks(html, catalog, slug);
  if (count === 0) {
    return {
      id: "internal-links",
      label: "Internal links",
      status: "fail",
      detail: "No internal links to other posts, destinations, or guides.",
      weight: 10,
    };
  }
  return {
    id: "internal-links",
    label: "Internal links",
    status: "pass",
    detail:
      count === 1
        ? "Links to another post, destination, or guide."
        : `${count} internal links to posts, destinations, or guides.`,
    weight: 10,
  };
}

function checkStaleYear(
  title: string,
  seoTitle: string,
  currentYear: number,
): WeightedCheck {
  const years = [
    ...new Set([
      ...pastYears(title, currentYear),
      ...pastYears(seoTitle, currentYear),
    ]),
  ].sort((a, b) => a - b);
  if (years.length > 0) {
    const listed = years.join(" and ");
    return {
      id: "stale-year",
      label: "Title year",
      status: "fail",
      detail: `Title mentions ${listed}, which is before ${currentYear}.`,
      weight: 8,
    };
  }
  return {
    id: "stale-year",
    label: "Title year",
    status: "pass",
    detail: "Title does not mention a past year.",
    weight: 8,
  };
}

function checkWordCount(text: string): WeightedCheck {
  const words = countWords(text);
  if (words < WORD_THIN) {
    return {
      id: "word-count",
      label: "Word count",
      status: "fail",
      detail: `About ${words} words. Aim for ${WORD_TARGET} or more.`,
      weight: 8,
    };
  }
  if (words < WORD_TARGET) {
    return {
      id: "word-count",
      label: "Word count",
      status: "warn",
      detail: `About ${words} words. ${WORD_TARGET}+ is a stronger target.`,
      weight: 8,
    };
  }
  return {
    id: "word-count",
    label: "Word count",
    status: "pass",
    detail: `About ${words} words.`,
    weight: 8,
  };
}

function checkJunk(html: string): WeightedCheck {
  const found = JUNK_PATTERNS.filter((pattern) => pattern.re.test(html)).map(
    (pattern) => pattern.label,
  );
  if (found.length > 0) {
    return {
      id: "migration-junk",
      label: "Migration leftovers",
      status: "fail",
      detail: `Leftover migration text: ${found.join(", ")}.`,
      weight: 12,
    };
  }
  return {
    id: "migration-junk",
    label: "Migration leftovers",
    status: "pass",
    detail: "No leftover shortcodes, Yoast notes, or template fragments.",
    weight: 12,
  };
}

function checkFocusKeyword(
  keyword: string,
  title: string,
  description: string,
): WeightedCheck | null {
  const focus = keyword.trim();
  if (!focus) return null;
  const haystackTitle = title.toLowerCase();
  const haystackDescription = description.toLowerCase();
  const needle = focus.toLowerCase();
  const inTitle = haystackTitle.includes(needle);
  const inDescription = haystackDescription.includes(needle);
  if (inTitle && inDescription) {
    return {
      id: "focus-keyword",
      label: "Focus keyword",
      status: "pass",
      detail: `“${focus}” appears in the SEO title and meta description.`,
      weight: 6,
    };
  }
  const missing = [
    !inTitle ? "SEO title" : null,
    !inDescription ? "meta description" : null,
  ].filter(Boolean);
  return {
    id: "focus-keyword",
    label: "Focus keyword",
    status: "warn",
    detail: `“${focus}” is missing from the ${missing.join(" and ")}.`,
    weight: 6,
  };
}

export function seoScoreBand(score: number): "good" | "fair" | "poor" {
  if (score >= 80) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

/**
 * Live SEO checklist for one post. Warnings never block publishing;
 * callers only display the result.
 */
export function auditPostSeo(
  input: SeoAuditInput,
  options: SeoAuditOptions = {},
): SeoAudit {
  const catalog = options.catalog ?? {
    postSlugs: [],
    destinationSlugs: [],
    guideSlugs: [],
  };
  const now = options.now ?? new Date();
  const currentYear = now.getFullYear();
  const title = effectiveTitle(input);
  const description = effectiveDescription(input);
  const html = input.contentHtml ?? "";
  const levels = headingLevels(html);
  const displayTitle = input.title?.trim() ?? "";
  const customTitle = input.seoTitle?.trim() ?? "";

  const weighted: WeightedCheck[] = [
    checkTitle(title),
    checkDescription(description),
    checkEllipsis(description),
    checkImageAlt(html),
  ];
  const hero = checkHeroAlt(input.featuredImage, displayTitle, customTitle);
  if (hero) weighted.push(hero);
  weighted.push(
    checkIntro(html),
    checkH2(levels),
    checkHierarchy(levels),
    checkPseudoHeadings(html),
    checkInternalLinks(html, catalog, input.slug?.trim() ?? ""),
    checkStaleYear(displayTitle, customTitle, currentYear),
    checkWordCount(storyText(input)),
    checkJunk(html),
  );
  const focus = checkFocusKeyword(
    input.focusKeyword ?? "",
    title,
    description,
  );
  if (focus) weighted.push(focus);

  const possible = weighted.reduce((sum, check) => sum + check.weight, 0);
  const earned = weighted.reduce((sum, check) => {
    const factor = check.status === "pass" ? 1 : check.status === "warn" ? 0.5 : 0;
    return sum + check.weight * factor;
  }, 0);
  const score = possible === 0 ? 100 : Math.round((earned / possible) * 100);
  const checks: SeoCheck[] = weighted.map((item) => ({
    id: item.id,
    label: item.label,
    status: item.status,
    detail: item.detail,
  }));
  const issues = [
    ...checks.filter((check) => check.status === "fail"),
    ...checks.filter((check) => check.status === "warn"),
  ].map((check) => check.detail);

  return { score, checks, issues };
}
