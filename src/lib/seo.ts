import type { Metadata } from "next";
import { site as contentSite } from "@/data/content";
import { getSiteDesign } from "@/lib/site-design";

const DEFAULT_SITE_URL = "https://www.fernandesjourneys.com";

/** Prefer CMS branding.logoOnLight; falls back if design JSON is incomplete. */
function designLogoOnLight(): string {
  try {
    const logo = getSiteDesign().branding.logoOnLight?.trim();
    if (logo) return logo;
  } catch {
    // ignore — use hardcoded default below
  }
  return "/brand/logo-fernandes-journeys.png";
}

function normalizeSiteUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

export const siteConfig = {
  name: contentSite.name,
  url: normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL,
  ),
  description:
    "Fernandes Journeys is a personal travel journal — destinations from past trips, trip notes, and photos from the road. Written by Alex Fernandes.",
  shortDescription:
    "Personal travel journal — destinations from past trips and notes from the road.",
  author: contentSite.authorName,
  email: contentSite.email,
  locale: "en_US",
  language: "en",
  twitter: undefined as string | undefined,
  instagram: contentSite.social.instagram,
  youtube: contentSite.social.youtube,
  /** Default share / OG image — Maroon Bells trip photo */
  ogImage:
    "/media/migrated/2026-06-a60c26af-799c-4f17-8a9f-f97a75adb417-e1780787677499-fcca20aa.webp",
  /** Organization JSON-LD logo — prefers CMS branding.logoOnLight (updates after redeploy, like hero). */
  logo: designLogoOnLight(),
  authorPhoto: contentSite.authorPhoto,
  keywords: [
    "travel journal",
    "Fernandes Journeys",
    "Alex Fernandes",
    "travel blog",
    "trip notes",
    "destinations",
    "Iceland",
    "Brazil",
    "Canada",
    "Mexico",
    "United States",
    "travel guides",
    "solo travel",
  ],
} as const;

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalized === "/" ? "" : normalized}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
}: {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const desc = description ?? siteConfig.description;
  const url = absoluteUrl(path);
  const ogImage = image ? absoluteUrl(image) : absoluteUrl(siteConfig.ogImage);

  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.email,
    logo: absoluteUrl(siteConfig.logo),
    founder: {
      "@type": "Person",
      name: siteConfig.author,
    },
    sameAs: [siteConfig.instagram, siteConfig.youtube].filter(Boolean),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteConfig.logo),
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function blogPostingJsonLd({
  title,
  description,
  path,
  datePublished,
  dateModified,
  image,
}: {
  title: string;
  description?: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string | null;
}) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: description || undefined,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: siteConfig.author,
      url: absoluteUrl("/about"),
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteConfig.logo),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    image: image ? [absoluteUrl(image)] : [absoluteUrl(siteConfig.ogImage)],
    url,
  };
}
