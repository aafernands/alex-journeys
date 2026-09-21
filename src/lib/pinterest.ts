const DEFAULT_SITE_URL = "https://www.fernandesjourneys.com";

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(
    /\/+$/,
    "",
  );
}

export const PINTEREST_CREATE_PIN_BASE =
  "https://www.pinterest.com/pin/create/button/";

/** Paths that are site chrome, not story photos. */
const DECORATIVE_PATH_RE =
  /\/brand\/|logo|avatar|favicon|apple-touch|author-photo|\/icons?\//i;

export type PinterestShareParams = {
  pageUrl: string;
  mediaUrl: string;
  description?: string;
};

export function toAbsoluteMediaUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${siteOrigin()}${normalized === "/" ? "" : normalized}`;
}

/** Pinterest create-pin URL with encodeURIComponent on every param. */
export function buildPinterestShareUrl({
  pageUrl,
  mediaUrl,
  description = "",
}: PinterestShareParams): string {
  const url = encodeURIComponent(pageUrl);
  const media = encodeURIComponent(toAbsoluteMediaUrl(mediaUrl));
  const desc = encodeURIComponent(description);
  return `${PINTEREST_CREATE_PIN_BASE}?url=${url}&media=${media}&description=${desc}`;
}

export function isPinnableImageSrc(
  src: string,
  options?: { width?: number; height?: number },
): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (/^(data|blob|javascript|about|file):/i.test(trimmed)) return false;

  let path = trimmed;
  try {
    if (trimmed.startsWith("//")) {
      path = new URL(`https:${trimmed}`).pathname;
    } else if (/^https?:\/\//i.test(trimmed)) {
      path = new URL(trimmed).pathname;
    } else {
      path = trimmed.split("?")[0] ?? trimmed;
    }
  } catch {
    return false;
  }

  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    /* keep path */
  }

  if (DECORATIVE_PATH_RE.test(decoded)) return false;

  const width = options?.width;
  const height = options?.height;
  if (width && width < 80 && (!height || height < 80)) return false;
  if (height && height < 80 && (!width || width < 80)) return false;

  return true;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function attr(tag: string, name: string): string | undefined {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*(["'])([^"']*)\\1`, "i");
  const quotedMatch = tag.match(quoted);
  if (quotedMatch) return quotedMatch[2];
  const unquoted = new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i");
  return tag.match(unquoted)?.[1];
}

function parseDimension(tag: string, name: string): number | undefined {
  const raw = attr(tag, name);
  if (!raw) return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : undefined;
}

function shouldSkipImgTag(tag: string, src: string): boolean {
  if (/\bdata-no-pin\b/i.test(tag)) return true;
  if (/\baria-hidden\s*=\s*(["']?)true\1/i.test(tag)) return true;
  if (/\brole\s*=\s*(["']?)presentation\1/i.test(tag)) return true;
  return !isPinnableImageSrc(src, {
    width: parseDimension(tag, "width"),
    height: parseDimension(tag, "height"),
  });
}

const PIN_ICON_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.3 2 11.6c0 4 2.5 7.4 6.1 8.7-.1-.7-.2-1.9 0-2.7.2-.7 1.2-5 1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.3 1 0.5 1.8 1.5 1.8 1.8 0 3.1-2.2 3.1-4.8 0-2-1.4-3.5-3.9-3.5-2.8 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.7 2.3.1.1.1.2.1.3l-.3 1c0 .1-.1.2-.3.1-1.2-.5-1.8-1.9-1.8-3.4 0-2.6 2.2-5.7 6.6-5.7 3.5 0 5.8 2.5 5.8 5.3 0 3.6-2 6.3-5 6.3-1 0-1.9-.5-2.2-1.2l-.6 2.3c-.2.8-.8 1.8-1.2 2.4.9.3 1.9.4 2.9.4 5.5 0 10-4.3 10-9.6C22 6.3 17.5 2 12 2Z"/></svg>';

export function pinterestPinMarkup({
  pageUrl,
  mediaSrc,
  description,
}: {
  pageUrl: string;
  mediaSrc: string;
  description: string;
}): string {
  const href = escapeAttr(
    buildPinterestShareUrl({
      pageUrl,
      mediaUrl: mediaSrc,
      description,
    }),
  );
  return `<a class="pinterest-pin-btn" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Pin on Pinterest">${PIN_ICON_SVG}</a>`;
}

function alreadyInsidePinnable(html: string, offset: number): boolean {
  const before = html.slice(0, offset);
  const openRe = /<span\b[^>]*\bpinnable-image\b[^>]*>/gi;
  let lastOpen = -1;
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(before))) {
    lastOpen = match.index + match[0].length;
  }
  if (lastOpen === -1) return false;
  return !/<\/span>/i.test(before.slice(lastOpen));
}

/**
 * Wrap content `<img>` tags with a hover/tap Pin control.
 * Runs after outbound-link rewriting so the pin URL is not sent through /out.
 */
export function wrapHtmlImagesWithPinterestPins(
  html: string,
  options: { pageUrl: string; description?: string },
): string {
  if (!html || !options.pageUrl) return html;
  const fallback = options.description?.trim() || "";

  const pinForImg = (imgTag: string): string | null => {
    const src = attr(imgTag, "src");
    if (!src || shouldSkipImgTag(imgTag, src)) return null;
    const alt = attr(imgTag, "alt")?.trim() || fallback;
    return pinterestPinMarkup({
      pageUrl: options.pageUrl,
      mediaSrc: src,
      description: alt,
    });
  };

  let out = html.replace(
    /<a\b([^>]*)>(\s*)(<img\b[^>]*>)(\s*)<\/a>/gi,
    (full, aAttrs: string, beforeImg: string, img: string, afterImg: string) => {
      const pin = pinForImg(img);
      if (!pin) return full;
      return `<span class="pinnable-image"><a${aAttrs}>${beforeImg}${img}${afterImg}</a>${pin}</span>`;
    },
  );

  out = out.replace(/<img\b[^>]*>/gi, (tag, offset: number) => {
    if (alreadyInsidePinnable(out, offset)) return tag;
    const pin = pinForImg(tag);
    if (!pin) return tag;
    return `<span class="pinnable-image">${tag}${pin}</span>`;
  });

  return out;
}
