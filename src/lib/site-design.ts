/**
 * Homepage / site design settings (Git-backed via CMS → Website design).
 * Defaults match the previous hardcoded Hero values in content.ts.
 */

import siteDesignJson from "@/data/site-design.json";
import authorPhotoMeta from "@/data/author-photo.json";
import { about, hero as contentHero, startHereCards, site } from "@/data/content";

import {
  DEFAULT_FROM_THE_ROAD_ITEMS,
  normalizeFromTheRoad,
  type FromTheRoadItem,
} from "@/lib/from-the-road";

export type { FromTheRoadItem };
export { DEFAULT_FROM_THE_ROAD_ITEMS };

export type HeroCta = {
  label: string;
  href: string;
};

export type HeroStat = {
  label: string;
  value: string;
  accent?: boolean;
};

export type FeaturedSlide = {
  id: string;
  image: string;
  imageAlt: string;
  /** Window-chrome location / caption */
  caption: string;
  /** Journal note shown beside the photo */
  note: string;
  windowBadge: string;
  stats: HeroStat[];
  /** Optional story / destination link */
  href: string;
  ctaLabel: string;
};

export type FeaturedSlideshow = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  autoplay: boolean;
  /** Autoplay interval in ms (clamped 4s–20s). */
  intervalMs: number;
  secondaryCta: HeroCta;
  slides: FeaturedSlide[];
};

export type HeroDesign = {
  image: string;
  imageAlt: string;
  /** Location label on the full-bleed hero photo */
  imageCaption: string;
  /** Legacy field — featured card now uses featuredSlideshow slides */
  windowBadge: string;
  /** Text after site name in the eyebrow pill */
  eyebrow: string;
  tagline: string;
  subtitle: string;
  ctaPrimary: HeroCta;
  ctaSecondary: HeroCta;
  /**
   * Quieter third link beside the journal CTAs.
   * Empty label hides it.
   */
  ctaTertiary: HeroCta;
  /** CSS object-position value, e.g. "center", "top", "50% 30%" */
  objectPosition: string;
  /** Soft dark overlay on hero image */
  overlay: boolean;
  showFromTheRoad: boolean;
  fromTheRoad: {
    label: string;
    items: FromTheRoadItem[];
  };
  stats: HeroStat[];
};

export type HomeSectionCard = {
  title: string;
  href: string;
  icon: string;
  description: string;
  cta: string;
};

export type HomeSectionChrome = {
  eyebrow: string;
  title: string;
  description?: string;
  ctaLabel?: string;
};

export type HomeSections = {
  startHere: HomeSectionChrome & { cards: HomeSectionCard[] };
  places: HomeSectionChrome;
  latest: HomeSectionChrome;
  guides: HomeSectionChrome;
  tools: HomeSectionChrome;
  oauthNote: {
    eyebrow: string;
    title: string;
    body: string;
  };
  author: {
    eyebrow: string;
    headline: string;
    body: string;
    /** Homepage author intro portrait (CMS). Empty → falls back to site.authorPhoto */
    photo: string;
    photoAlt: string;
    primaryCta: HeroCta;
    secondaryCta: HeroCta;
  };
};

export type BrandingDesign = {
  /** Dark / black mark for light backgrounds */
  logoOnLight: string;
  /** White / light mark for dark backgrounds */
  logoOnDark: string;
  /** Sitewide visual logo scale as a percentage of the component's normal size. */
  logoScalePercent: number;
  /** Browser favicon path or URL. */
  favicon: string;
};

export type SiteDesign = {
  updatedAt: string;
  branding: BrandingDesign;
  hero: HeroDesign;
  featuredSlideshow: FeaturedSlideshow;
  homeSections: HomeSections;
  seo: {
    /** Optional homepage title override snippet (empty = use site default) */
    homeTitleSnippet: string;
  };
  flags: {
    showHeroStats: boolean;
  };
};

const MAX_FEATURED_SLIDES = 12;


const DEFAULT_HOME_SECTIONS: HomeSections = {
  startHere: {
    eyebrow: "New here?",
    title: "Start here.",
    description:
      "Three easy ways into the journal — places I've been, stories from the road, and practical notes I still use.",
    cards: startHereCards.map((c) => ({ ...c })),
  },
  places: {
    eyebrow: "Places",
    title: "Places from the journal.",
    description:
      "Photo-led stops from trips already taken — tap a place to browse related stories.",
  },
  latest: {
    eyebrow: "From the journal",
    title: "Latest stories.",
    ctaLabel: "Browse all stories",
  },
  guides: {
    eyebrow: "Guides",
    title: "Guides worth opening.",
    description:
      "Six hubs of notes I still use — planning, money, packing, smarter travel, stays, and experiences.",
    ctaLabel: "All guides",
  },
  tools: {
    eyebrow: "Tools",
    title: "Tools I use.",
    description:
      "Partners I actually open when planning — stays, flights, insurance, and connectivity.",
    ctaLabel: "See all tools",
  },
  oauthNote: {
    eyebrow: "About this site & Google Sign-In",
    title: "",
    body: "This is a personal travel journal. Public content is viewable without login. Google Sign-In is only for optional reader saved posts and for the owner's private content management system (/cms) — not a consumer login product.",
  },
  author: {
    eyebrow: "About the journal",
    headline: about.headline,
    body: about.paragraphs[0],
    photo: authorPhotoMeta.src,
    photoAlt: site.authorName,
    primaryCta: { label: "About me", href: "/about" },
    secondaryCta: { label: "Start here", href: "/start-here" },
  },
};

const DEFAULT_HERO: HeroDesign = {
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
    href: "/guides/plan-a-trip",
  },
  ctaTertiary: {
    label: "Read stories",
    href: "/blog",
  },
  objectPosition: "center",
  overlay: true,
  showFromTheRoad: true,
  fromTheRoad: {
    label: "From the road",
    items: DEFAULT_FROM_THE_ROAD_ITEMS.map((item) => ({ ...item })),
  },
  stats: [
    { label: "Light", value: "Sunrise" },
    { label: "Season", value: "Alpine" },
    { label: "Journal", value: "Featured", accent: true },
  ],
};

function seedFeaturedSlideFromHero(
  hero: HeroDesign,
  id = "slide-featured-seed",
): FeaturedSlide {
  const caption = hero.imageCaption || "Maroon Bells · Colorado";
  return {
    id,
    image: hero.image,
    imageAlt: hero.imageAlt,
    caption,
    note: `Sunrise at ${caption.replace(" · ", ", ")} — cold air, quiet lake, and the kind of light that makes you glad you left before dawn. Start here for places, stories, and guides from trips already behind me.`,
    windowBadge: hero.windowBadge || "Field note",
    stats: hero.stats.map((s) => ({ ...s })),
    href: "/marron-bells",
    ctaLabel: "Read the sunrise story",
  };
}

function defaultFeaturedSlideshow(hero: HeroDesign): FeaturedSlideshow {
  return {
    enabled: true,
    eyebrow: "Field notes",
    title: "A field note worth opening.",
    autoplay: true,
    intervalMs: 8000,
    secondaryCta: { label: "New here? Start here", href: "/start-here" },
    slides: [seedFeaturedSlideFromHero(hero)],
  };
}

export const DEFAULT_SITE_DESIGN: SiteDesign = {
  updatedAt: "2026-09-20T00:00:00.000Z",
  branding: {
    logoOnLight: "/brand/logo-on-light.png",
    logoOnDark: "/brand/logo-on-dark.png",
    logoScalePercent: 50,
    favicon: "/favicon.ico",
  },
  homeSections: structuredClone(DEFAULT_HOME_SECTIONS),
  hero: structuredClone(DEFAULT_HERO),
  featuredSlideshow: defaultFeaturedSlideshow(DEFAULT_HERO),
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

function isAllowedAssetPath(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (v.startsWith("/brand/") || v.startsWith("/media/")) return true;
  return false;
}

function normalizeBranding(
  raw: unknown,
  fallback: BrandingDesign,
): BrandingDesign {
  if (!raw || typeof raw !== "object") {
    return { ...fallback };
  }
  const o = raw as Record<string, unknown>;
  const logoOnLight =
    asString(o.logoOnLight, fallback.logoOnLight).trim() ||
    fallback.logoOnLight;
  const logoOnDark =
    asString(o.logoOnDark, fallback.logoOnDark).trim() || fallback.logoOnDark;
  const rawScale = Number(o.logoScalePercent);
  const logoScalePercent = Number.isFinite(rawScale)
    ? Math.min(150, Math.max(25, Math.round(rawScale)))
    : fallback.logoScalePercent;
  const favicon =
    asString(o.favicon, fallback.favicon).trim() || fallback.favicon;
  return { logoOnLight, logoOnDark, logoScalePercent, favicon };
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

/** Missing tertiary CTA uses the fallback. A blank label hides the link. */
function normalizeOptionalCta(raw: unknown, fallback: HeroCta): HeroCta {
  if (raw === undefined || raw === null) return { ...fallback };
  if (typeof raw !== "object") return { ...fallback };
  const o = raw as Record<string, unknown>;
  const label = asString(o.label, "").trim();
  if (!label) return { label: "", href: "" };
  const href = asString(o.href, fallback.href).trim() || fallback.href;
  return { label, href };
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

function newSlideId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `slide-${crypto.randomUUID()}`;
  }
  return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSlide(raw: unknown, fallback: FeaturedSlide, index: number): FeaturedSlide {
  if (!raw || typeof raw !== "object") {
    return { ...fallback, stats: fallback.stats.map((s) => ({ ...s })) };
  }
  const o = raw as Record<string, unknown>;
  const id = asString(o.id, fallback.id).trim() || `slide-${index + 1}`;
  return {
    id,
    image: asString(o.image, fallback.image).trim(),
    imageAlt: asString(o.imageAlt, fallback.imageAlt),
    caption: asString(o.caption, fallback.caption),
    note: asString(o.note, fallback.note),
    windowBadge: asString(o.windowBadge, fallback.windowBadge),
    stats: normalizeStats(o.stats, fallback.stats),
    href: asString(o.href, fallback.href).trim(),
    ctaLabel: asString(o.ctaLabel, fallback.ctaLabel),
  };
}

function normalizeFeaturedSlideshow(
  raw: unknown,
  fallback: FeaturedSlideshow,
  hero: HeroDesign,
): FeaturedSlideshow {
  const seeded = defaultFeaturedSlideshow(hero);
  if (!raw || typeof raw !== "object") {
    return seeded;
  }
  const o = raw as Record<string, unknown>;
  const slidesRaw = Array.isArray(o.slides) ? o.slides : null;
  const seedSlide = seeded.slides[0];
  const slides = slidesRaw
    ? slidesRaw.slice(0, MAX_FEATURED_SLIDES).map((item, i) =>
        normalizeSlide(item, seedSlide, i),
      )
    : fallback.slides.map((s, i) => normalizeSlide(s, seedSlide, i));

  const interval = Number(o.intervalMs);
  return {
    enabled: asBool(o.enabled, fallback.enabled),
    eyebrow: asString(o.eyebrow, fallback.eyebrow),
    title: asString(o.title, fallback.title),
    autoplay: asBool(o.autoplay, fallback.autoplay),
    intervalMs:
      Number.isFinite(interval) && interval > 0
        ? Math.min(20000, Math.max(4000, Math.round(interval)))
        : fallback.intervalMs,
    secondaryCta: normalizeCta(o.secondaryCta, fallback.secondaryCta),
    slides: slides.length ? slides : seeded.slides,
  };
}

/** Slides with an image — used on the public homepage. */
export function visibleFeaturedSlides(slideshow: FeaturedSlideshow): FeaturedSlide[] {
  return slideshow.slides.filter((s) => s.image.trim().length > 0);
}

function emptySlide(): FeaturedSlide {
  return {
    id: newSlideId(),
    image: "",
    imageAlt: "",
    caption: "",
    note: "",
    windowBadge: "Field note",
    stats: [
      { label: "", value: "" },
      { label: "", value: "" },
      { label: "", value: "" },
    ],
    href: "",
    ctaLabel: "",
  };
}

export function createEmptyFeaturedSlide(): FeaturedSlide {
  return emptySlide();
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
    ctaTertiary: normalizeOptionalCta(
      heroRaw.ctaTertiary,
      base.hero.ctaTertiary,
    ),
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


function normalizeHomeSections(raw: unknown, fallback: HomeSections): HomeSections {
  const root =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  function chrome(
    key: keyof HomeSections,
    fb: HomeSectionChrome,
  ): HomeSectionChrome {
    const o =
      root[key] && typeof root[key] === "object"
        ? (root[key] as Record<string, unknown>)
        : {};
    return {
      eyebrow: asString(o.eyebrow, fb.eyebrow),
      title: asString(o.title, fb.title),
      ...(fb.description !== undefined
        ? { description: asString(o.description, fb.description ?? "") }
        : o.description
          ? { description: asString(o.description, "") }
          : {}),
      ...(fb.ctaLabel !== undefined || o.ctaLabel
        ? { ctaLabel: asString(o.ctaLabel, fb.ctaLabel ?? "") }
        : {}),
    };
  }

  const startRaw =
    root.startHere && typeof root.startHere === "object"
      ? (root.startHere as Record<string, unknown>)
      : {};
  const cardsRaw = Array.isArray(startRaw.cards) ? startRaw.cards : null;
  const cards: HomeSectionCard[] = cardsRaw
    ? cardsRaw.slice(0, 6).map((item, i) => {
        const fb = fallback.startHere.cards[i] ?? fallback.startHere.cards[0];
        const o =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
        return {
          title: asString(o.title, fb.title),
          href: asString(o.href, fb.href),
          icon: asString(o.icon, fb.icon),
          description: asString(o.description, fb.description),
          cta: asString(o.cta, fb.cta),
        };
      })
    : fallback.startHere.cards.map((c) => ({ ...c }));

  const startChrome = chrome("startHere", fallback.startHere);
  const oauthRaw =
    root.oauthNote && typeof root.oauthNote === "object"
      ? (root.oauthNote as Record<string, unknown>)
      : {};
  const authorRaw =
    root.author && typeof root.author === "object"
      ? (root.author as Record<string, unknown>)
      : {};

  return {
    startHere: {
      ...startChrome,
      description: asString(
        startRaw.description,
        fallback.startHere.description ?? "",
      ),
      cards: cards.length ? cards : fallback.startHere.cards.map((c) => ({ ...c })),
    },
    places: chrome("places", fallback.places),
    latest: {
      ...chrome("latest", fallback.latest),
      ctaLabel: asString(
        (root.latest as Record<string, unknown> | undefined)?.ctaLabel,
        fallback.latest.ctaLabel ?? "Browse all stories",
      ),
    },
    guides: {
      ...chrome("guides", fallback.guides),
      description: asString(
        (root.guides as Record<string, unknown> | undefined)?.description,
        fallback.guides.description ?? "",
      ),
      ctaLabel: asString(
        (root.guides as Record<string, unknown> | undefined)?.ctaLabel,
        fallback.guides.ctaLabel ?? "All guides",
      ),
    },
    tools: {
      ...chrome("tools", fallback.tools),
      description: asString(
        (root.tools as Record<string, unknown> | undefined)?.description,
        fallback.tools.description ?? "",
      ),
      ctaLabel: asString(
        (root.tools as Record<string, unknown> | undefined)?.ctaLabel,
        fallback.tools.ctaLabel ?? "See all tools",
      ),
    },
    oauthNote: {
      eyebrow: asString(oauthRaw.eyebrow, fallback.oauthNote.eyebrow),
      title: asString(oauthRaw.title, fallback.oauthNote.title),
      body: asString(oauthRaw.body, fallback.oauthNote.body),
    },
    author: {
      eyebrow: asString(authorRaw.eyebrow, fallback.author.eyebrow),
      headline: asString(authorRaw.headline, fallback.author.headline),
      body: asString(authorRaw.body, fallback.author.body),
      photo: asString(authorRaw.photo, fallback.author.photo).trim(),
      photoAlt: asString(authorRaw.photoAlt, fallback.author.photoAlt),
      primaryCta: normalizeCta(authorRaw.primaryCta, fallback.author.primaryCta),
      secondaryCta: normalizeCta(
        authorRaw.secondaryCta,
        fallback.author.secondaryCta,
      ),
    },
  };
}

  const homeSections = normalizeHomeSections(
    root.homeSections,
    base.homeSections,
  );

  const featuredSlideshow = normalizeFeaturedSlideshow(
    root.featuredSlideshow,
    base.featuredSlideshow,
    hero,
  );

  const branding = normalizeBranding(root.branding, base.branding);

  return {
    updatedAt: asString(root.updatedAt, base.updatedAt),
    branding,
    hero,
    featuredSlideshow,
    homeSections,
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
  if (hero.ctaTertiary.label.trim()) {
    if (hero.ctaTertiary.label.length > SHORT_MAX) {
      return { ok: false, error: "Tertiary CTA label is too long (max 120)." };
    }
    const tertiaryErr = validateHref(hero.ctaTertiary.href, "Tertiary CTA");
    if (tertiaryErr) return { ok: false, error: tertiaryErr };
  }

  if (hero.fromTheRoad.label.length > SHORT_MAX) {
    return { ok: false, error: "From the road heading is too long (max 120)." };
  }
  for (let i = 0; i < hero.fromTheRoad.items.length; i++) {
    const item = hero.fromTheRoad.items[i];
    const n = i + 1;
    if (!item.label.trim()) {
      return { ok: false, error: `From the road item ${n} label is required.` };
    }
    if (item.label.length > SHORT_MAX) {
      return {
        ok: false,
        error: `From the road item ${n} label is too long (max 120).`,
      };
    }
    const itemHrefErr = validateHref(
      item.href,
      `From the road item ${n}`,
    );
    if (itemHrefErr) return { ok: false, error: itemHrefErr };
  }

  if (!hero.ctaPrimary.label.trim()) {
    return { ok: false, error: "Primary CTA label is required." };
  }
  if (!hero.ctaSecondary.label.trim()) {
    return { ok: false, error: "Secondary CTA label is required." };
  }

  const { featuredSlideshow } = design;
  if (featuredSlideshow.title.length > SHORT_MAX) {
    return { ok: false, error: "Featured slideshow title is too long (max 120)." };
  }
  if (featuredSlideshow.eyebrow.length > SHORT_MAX) {
    return { ok: false, error: "Featured slideshow eyebrow is too long (max 120)." };
  }
  const secondarySlideCta = validateHref(
    featuredSlideshow.secondaryCta.href,
    "Featured slideshow secondary CTA",
  );
  if (featuredSlideshow.secondaryCta.href.trim() && secondarySlideCta) {
    return { ok: false, error: secondarySlideCta };
  }

  for (let i = 0; i < featuredSlideshow.slides.length; i++) {
    const slide = featuredSlideshow.slides[i];
    const n = i + 1;
    if (slide.image.trim()) {
      if (
        !slide.image.startsWith("/") &&
        !/^https?:\/\//i.test(slide.image)
      ) {
        return {
          ok: false,
          error: `Featured slide ${n} image must be a site path (/media/…) or https URL.`,
        };
      }
    }
    if (slide.imageAlt.length > TEXT_MAX) {
      return { ok: false, error: `Featured slide ${n} alt is too long.` };
    }
    if (slide.caption.length > SHORT_MAX) {
      return { ok: false, error: `Featured slide ${n} caption is too long (max 120).` };
    }
    if (slide.note.length > 800) {
      return { ok: false, error: `Featured slide ${n} note is too long (max 800).` };
    }
    if (slide.href.trim()) {
      const hrefErr = validateHref(slide.href, `Featured slide ${n} link`);
      if (hrefErr) return { ok: false, error: hrefErr };
    }
  }

  const author = design.homeSections.author;
  if (author.photo.trim()) {
    if (
      !author.photo.startsWith("/") &&
      !/^https?:\/\//i.test(author.photo)
    ) {
      return {
        ok: false,
        error:
          "Author photo must be a site path (/media/… or /brand/…) or https URL.",
      };
    }
  }
  if (author.photoAlt.length > TEXT_MAX) {
    return { ok: false, error: "Author photo alt is too long." };
  }
  if (author.body.length > 800) {
    return { ok: false, error: "Author intro body is too long (max 800)." };
  }
  const authorPrimaryErr = validateHref(
    author.primaryCta.href,
    "Author primary CTA",
  );
  if (authorPrimaryErr) return { ok: false, error: authorPrimaryErr };
  const authorSecondaryErr = validateHref(
    author.secondaryCta.href,
    "Author secondary CTA",
  );
  if (authorSecondaryErr) return { ok: false, error: authorSecondaryErr };

  const { branding } = design;
  if (!branding.logoOnLight.trim()) {
    return { ok: false, error: "Logo (on light) is required." };
  }
  if (!isAllowedAssetPath(branding.logoOnLight)) {
    return {
      ok: false,
      error: "Logo (on light) must be /brand/…, /media/…, or an https URL.",
    };
  }
  if (!branding.logoOnDark.trim()) {
    return { ok: false, error: "Logo (on dark) is required." };
  }
  if (!isAllowedAssetPath(branding.logoOnDark)) {
    return {
      ok: false,
      error: "Logo (on dark) must be /brand/…, /media/…, or an https URL.",
    };
  }

  return {
    ok: true,
    design: {
      ...design,
      updatedAt: new Date().toISOString(),
      branding: {
        logoOnLight: branding.logoOnLight.trim(),
        logoOnDark: branding.logoOnDark.trim(),
        logoScalePercent: branding.logoScalePercent,
        favicon: branding.favicon.trim() || "/favicon.ico",
      },
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
        ctaTertiary: {
          label: hero.ctaTertiary.label.trim(),
          href: hero.ctaTertiary.href.trim(),
        },
        objectPosition: hero.objectPosition.trim() || "center",
        fromTheRoad: {
          label: hero.fromTheRoad.label.trim(),
          items: hero.fromTheRoad.items.map((item) => ({
            label: item.label.trim(),
            href: item.href.trim(),
          })),
        },
      },
      featuredSlideshow: {
        ...featuredSlideshow,
        eyebrow: featuredSlideshow.eyebrow.trim(),
        title: featuredSlideshow.title.trim(),
        secondaryCta: {
          label: featuredSlideshow.secondaryCta.label.trim(),
          href: featuredSlideshow.secondaryCta.href.trim(),
        },
        slides: featuredSlideshow.slides.map((slide) => ({
          ...slide,
          id: slide.id.trim() || newSlideId(),
          image: slide.image.trim(),
          imageAlt: slide.imageAlt.trim(),
          caption: slide.caption.trim(),
          note: slide.note.trim(),
          windowBadge: slide.windowBadge.trim(),
          href: slide.href.trim(),
          ctaLabel: slide.ctaLabel.trim(),
          stats: slide.stats.map((s) => ({
            label: s.label.trim(),
            value: s.value.trim(),
            ...(s.accent ? { accent: true } : {}),
          })),
        })),
      },
      homeSections: {
        ...design.homeSections,
        author: {
          ...author,
          eyebrow: author.eyebrow.trim(),
          headline: author.headline.trim(),
          body: author.body.trim(),
          photo: author.photo.trim(),
          photoAlt: author.photoAlt.trim(),
          primaryCta: {
            label: author.primaryCta.label.trim(),
            href: author.primaryCta.href.trim(),
          },
          secondaryCta: {
            label: author.secondaryCta.label.trim(),
            href: author.secondaryCta.href.trim(),
          },
        },
      },
    },
  };
}
