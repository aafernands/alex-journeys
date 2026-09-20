/**
 * Outbound interstitial helpers — pause before leaving fernandesjourneys.com.
 * URL shape: /out?to=<urlencoded https url>[&aff=1]
 */

import { siteConfig } from "@/lib/seo";

const OWN_HOST_FALLBACKS = [
  "fernandesjourneys.com",
  "www.fernandesjourneys.com",
] as const;

export const OUTBOUND_DELAY_MS = 4000;
export const OUTBOUND_REDUCED_MOTION_DELAY_MS = 400;

function ownHosts(): Set<string> {
  const hosts = new Set<string>(OWN_HOST_FALLBACKS);
  try {
    hosts.add(new URL(siteConfig.url).hostname.toLowerCase());
  } catch {
    /* ignore */
  }
  return hosts;
}

/** True when the URL points at this site (any path). */
export function isOwnHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (ownHosts().has(host)) return true;
  const bare = host.replace(/^www\./, "");
  for (const h of ownHosts()) {
    if (h.replace(/^www\./, "") === bare) return true;
  }
  return false;
}

/**
 * Parse and validate an absolute http(s) URL for outbound use.
 * Rejects javascript:, data:, and other non-http schemes.
 * Returns null for invalid / unsafe / own-host URLs.
 */
export function parseSafeExternalUrl(
  raw: string | null | undefined,
): URL | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^(javascript|data|vbscript|file|blob|about):/i.test(trimmed)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  if (url.username || url.password) return null;
  if (isOwnHost(url)) return null;

  return url;
}

export type OutboundHrefOptions = {
  /** When true, interstitial shows an honest affiliate line. */
  affiliate?: boolean;
};

/**
 * Build the interstitial path for an external http(s) URL.
 * Own-host / relative / unsafe inputs are returned unchanged (or as a
 * same-site path) so callers never break internal navigation.
 */
export function outboundHref(
  url: string,
  options: OutboundHrefOptions = {},
): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  if (isOwnHost(parsed)) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  }

  const safe = parseSafeExternalUrl(trimmed);
  if (!safe) return trimmed;

  const params = new URLSearchParams();
  params.set("to", safe.href);
  if (options.affiliate) params.set("aff", "1");
  return `/out?${params.toString()}`;
}

/** Hostname for display. */
export function outboundHostname(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

function attrHasAffiliate(attrBlob: string): boolean {
  if (/\bdata-affiliate\b/i.test(attrBlob)) return true;
  const relMatch = attrBlob.match(/\brel\s*=\s*(["'])([^"']*)\1/i);
  if (relMatch && /\bsponsored\b/i.test(relMatch[2])) return true;
  return false;
}

/**
 * Rewrite external http(s) anchors in HTML through /out.
 * Marks affiliate when rel contains sponsored or data-affiliate is set.
 */
export function rewriteHtmlExternalLinks(html: string): string {
  return html.replace(
    /<a\b([^>]*?)>/gi,
    (full, rawAttrs: string) => {
      const hrefMatch = rawAttrs.match(/\bhref\s*=\s*(["'])([^"']+)\1/i);
      if (!hrefMatch) return full;

      const href = hrefMatch[2];
      const safe = parseSafeExternalUrl(href);
      if (!safe) return full;

      const affiliate = attrHasAffiliate(rawAttrs);
      const nextHref = outboundHref(safe.href, { affiliate });

      let attrs = rawAttrs.replace(
        /\bhref\s*=\s*(["'])([^"']+)\1/i,
        `href=$1${nextHref}$1`,
      );

      if (!/\btarget\s*=/i.test(attrs)) {
        attrs += ` target="_blank"`;
      }

      if (!/\brel\s*=/i.test(attrs)) {
        attrs += affiliate
          ? ` rel="noopener noreferrer sponsored"`
          : ` rel="noopener noreferrer"`;
      } else if (!/\bnoopener\b/i.test(attrs)) {
        attrs = attrs.replace(
          /\brel\s*=\s*(["'])([^"']*)\1/i,
          (_m, q: string, rel: string) =>
            `rel=${q}${`${rel} noopener noreferrer`.trim()}${q}`,
        );
      }

      return `<a${attrs}>`;
    },
  );
}
