/**
 * Homepage / site design settings (Git-backed via CMS → Website design).
 * Defaults match the previous hardcoded Hero values in content.ts.
 */

import siteDesignJson from "@/data/site-design.json";
import { hero as contentHero } from "@/data/content";

export type HeroCta = {
  label: string;
  href: string;
};

export type HeroStat = {
  label: string;
  value: string;
  accent?: boolean;
};

export type HeroDesign = {
  image: string;
  imageAlt: string;
  /** Window chrome location / caption text */
  imageCaption: string;
  /** Small badge in the photo window chrome (e.g. "Field note") */
  windowBadge: string;
  /** Text after site name in the eyebrow pill */
  eyebrow: string;
  tagline: string;
  subtitle: string;
  ctaPrimary: HeroCta;
  ctaSecondary: HeroCta;
  /** CSS object-position value, e.g. "center", "top", "50% 30%" */
  objectPosition: string;
  /** Soft dark overlay on hero image */
  overlay: boolean;
  showFromTheRoad: boolean;
  fromTheRoad: {
    label: string;
    items: string[];
  };
  stats: HeroStat[];
};

export type SiteDesign = {
  updatedAt: string;
  hero: HeroDesign;
  seo: {
    /** Optional homepage title override snippet (empty = use site default) */
    homeTitleSnippet: string;
  };
  flags: {
    showHeroStats: boolean;
  };
};

export const DEFAULT_SITE_DESIGN: SiteDesign = {
  updatedAt: "2026-09-20T00:00:00.000Z",
  hero: {
    image: contentHero.image,
    imageAlt: contentHero.imageAlt,
    imageCaption: "Maroon Bells · Colorado",
    windowBadge: "Field note",
    eyebrow: "Personal travel journal",
    tagline: contentHero.tagline,
    subtitle: contentHero.subtitle,
    ctaPrimary: {
      label: contentHero.ctaPrimary,
      href: "/destinations",
    },
    ctaSecondary: {
      label: contentHero.ctaSecondary,
      href: "/blog",
    },
    objectPosition: "center",
    overlay: false,
    showFromTheRoad: true,
    fromTheRoad: {
      label: "From the road",
      items: ["Places visited", "Trip notes & photos", "Tools I still use"],
    },
    stats: [
      { label: "Light", value: "Sunrise" },
      { label: "Season", value: "Alpine" },
      { label: "Journal", value: "Featured", accent: true },
    ],
  },
  seo: {
    homeTitleSnippet: "",
  },
  flags: {
    showHeroStats: true,
  },
};

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCta(raw: unknown, fallback: HeroCta): HeroCta {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  return {
    label: asString(o.label, fallback.label).trim() || fallback.label,
    href: asString(o.href, fallback.href).trim() || fallback.href,
  };
}

function normalizeStats(raw: unknown, fallback: HeroStat[]): HeroStat[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback.map((s) => ({ ...s }));
  }
  return raw.slice(0, 3).map((item, i) => {
    const fb = fallback[i] ?? { label: "", value: "" };
    if (!item || typeof item !== "object") return { ...fb };
    const o = item as Record<string, unknown>;
    return {
      label: asString(o.label, fb.label),
      value: asString(o.value, fb.value),
      ...(o.accent === true || fb.accent ? { accent: true } : {}),
    };
  });
}

function normalizeFromTheRoad(
  raw: unknown,
  fallback: HeroDesign["fromTheRoad"],
): HeroDesign["fromTheRoad"] {
  if (!raw || typeof raw !== "object") {
    return {
      label: fallback.label,
      items: [...fallback.items],
    };
  }
  const o = raw as Record<string, unknown>;
  const items = Array.isArray(o.items)
    ? o.items
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [...fallback.items];
  return {
    label: asString(o.label, fallback.label).trim() || fallback.label,
    items: items.length ? items : [...fallback.items],
  };
}

/** Merge partial/unknown JSON into a full SiteDesign with safe defaults. */
export function normalizeSiteDesign(raw: unknown): SiteDesign {
  const base = DEFAULT_SITE_DESIGN;
  if (!raw || typeof raw !== "object") {
    return structuredClone(base);
  }
  const root = raw as Record<string, unknown>;
  const heroRaw =
    root.hero && typeof root.hero === "object"
      ? (root.hero as Record<string, unknown>)
      : {};
  const seoRaw =
    root.seo && typeof root.seo === "object"
      ? (root.seo as Record<string, unknown>)
      : {};
  const flagsRaw =
    root.flags && typeof root.flags === "object"
      ? (root.flags as Record<string, unknown>)
      : {};

  const hero: HeroDesign = {
    image:
      asString(heroRaw.image, base.hero.image).trim() || base.hero.image,
    imageAlt: asString(heroRaw.imageAlt, base.hero.imageAlt),
    imageCaption: asString(heroRaw.imageCaption, base.hero.imageCaption),
    windowBadge: asString(heroRaw.windowBadge, base.hero.windowBadge),
    eyebrow: asString(heroRaw.eyebrow, base.hero.eyebrow),
    tagline: asString(heroRaw.tagline, base.hero.tagline),
    subtitle: asString(heroRaw.subtitle, base.hero.subtitle),
    ctaPrimary: normalizeCta(heroRaw.ctaPrimary, base.hero.ctaPrimary),
    ctaSecondary: normalizeCta(heroRaw.ctaSecondary, base.hero.ctaSecondary),
    objectPosition:
      asString(heroRaw.objectPosition, base.hero.objectPosition).trim() ||
      "center",
    overlay: asBool(heroRaw.overlay, base.hero.overlay),
    showFromTheRoad: asBool(
      heroRaw.showFromTheRoad,
      base.hero.showFromTheRoad,
    ),
    fromTheRoad: normalizeFromTheRoad(
      heroRaw.fromTheRoad,
      base.hero.fromTheRoad,
    ),
    stats: normalizeStats(heroRaw.stats, base.hero.stats),
  };

  return {
    updatedAt: asString(root.updatedAt, base.updatedAt),
    hero,
    seo: {
      homeTitleSnippet: asString(
        seoRaw.homeTitleSnippet,
        base.seo.homeTitleSnippet,
      ),
    },
    flags: {
      showHeroStats: asBool(
        flagsRaw.showHeroStats,
        base.flags.showHeroStats,
      ),
    },
  };
}

/** Load committed site design (with fallbacks). Safe for server components. */
export function getSiteDesign(): SiteDesign {
  try {
    return normalizeSiteDesign(siteDesignJson);
  } catch {
    return structuredClone(DEFAULT_SITE_DESIGN);
  }
}

const HREF_MAX = 500;
const TEXT_MAX = 500;
const SHORT_MAX = 120;

export type SiteDesignValidation =
  | { ok: true; design: SiteDesign }
  | { ok: false; error: string };

function validateHref(href: string, field: string): string | null {
  const h = href.trim();
  if (!h) return `${field} href is required.`;
  if (h.length > HREF_MAX) return `${field} href is too long.`;
  if (
    !h.startsWith("/") &&
    !h.startsWith("#") &&
    !/^https?:\/\//i.test(h)
  ) {
    return `${field} href must be a site path (/…), hash (#…), or https URL.`;
  }
  return null;
}

/** Validate and normalize a design payload from the CMS API. */
export function validateSiteDesignInput(raw: unknown): SiteDesignValidation {
  const design = normalizeSiteDesign(raw);
  const { hero } = design;

  if (!hero.image.trim()) {
    return { ok: false, error: "Hero image is required." };
  }
  if (
    !hero.image.startsWith("/") &&
    !/^https?:\/\//i.test(hero.image)
  ) {
    return {
      ok: false,
      error: "Hero image must be a site path (/media/…) or https URL.",
    };
  }
  if (!hero.tagline.trim()) {
    return { ok: false, error: "Tagline is required." };
  }
  if (hero.tagline.length > SHORT_MAX) {
    return { ok: false, error: "Tagline is too long (max 120)." };
  }
  if (!hero.subtitle.trim()) {
    return { ok: false, error: "Subtitle is required." };
  }
  if (hero.subtitle.length > TEXT_MAX) {
    return { ok: false, error: "Subtitle is too long (max 500)." };
  }
  if (hero.imageAlt.length > TEXT_MAX) {
    return { ok: false, error: "Image alt is too long." };
  }
  if (hero.imageCaption.length > SHORT_MAX) {
    return { ok: false, error: "Location label is too long (max 120)." };
  }

  const primaryErr = validateHref(hero.ctaPrimary.href, "Primary CTA");
  if (primaryErr) return { ok: false, error: primaryErr };
  const secondaryErr = validateHref(hero.ctaSecondary.href, "Secondary CTA");
  if (secondaryErr) return { ok: false, error: secondaryErr };

  if (!hero.ctaPrimary.label.trim()) {
    return { ok: false, error: "Primary CTA label is required." };
  }
  if (!hero.ctaSecondary.label.trim()) {
    return { ok: false, error: "Secondary CTA label is required." };
  }

  return {
    ok: true,
    design: {
      ...design,
      updatedAt: new Date().toISOString(),
      hero: {
        ...hero,
        image: hero.image.trim(),
        imageAlt: hero.imageAlt.trim(),
        imageCaption: hero.imageCaption.trim(),
        windowBadge: hero.windowBadge.trim(),
        eyebrow: hero.eyebrow.trim(),
        tagline: hero.tagline.trim(),
        subtitle: hero.subtitle.trim(),
        ctaPrimary: {
          label: hero.ctaPrimary.label.trim(),
          href: hero.ctaPrimary.href.trim(),
        },
        ctaSecondary: {
          label: hero.ctaSecondary.label.trim(),
          href: hero.ctaSecondary.href.trim(),
        },
        objectPosition: hero.objectPosition.trim() || "center",
      },
    },
  };
}
