import fs from "node:fs";
import path from "node:path";
import type {
  MediaIndex,
  MediaItem,
  MediaSource,
  MediaUsedBy,
} from "@/lib/cms/media-types";

const MEDIA_DIR = path.join(process.cwd(), "src/content/media");
const INDEX_PATH = path.join(MEDIA_DIR, "_index.json");

export function getMediaIndexPath(): string {
  return INDEX_PATH;
}

export function readMediaIndex(): MediaIndex {
  if (!fs.existsSync(INDEX_PATH)) {
    return { updatedAt: new Date().toISOString(), count: 0, items: [] };
  }
  const raw = fs.readFileSync(INDEX_PATH, "utf8");
  const data = JSON.parse(raw) as MediaIndex;
  return {
    updatedAt: data.updatedAt || new Date().toISOString(),
    count: data.items?.length ?? 0,
    items: Array.isArray(data.items) ? data.items : [],
  };
}

export function getAllMedia(): MediaItem[] {
  return readMediaIndex().items;
}

export function getMediaById(id: string): MediaItem | null {
  return getAllMedia().find((m) => m.id === id || m.slug === id) ?? null;
}

export function detectMediaSource(url: string): MediaSource {
  const trimmed = url.trim();
  if (trimmed.startsWith("/media/")) {
    return "upload";
  }
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (
      host === "i0.wp.com" ||
      host === "i1.wp.com" ||
      host === "i2.wp.com" ||
      host.endsWith(".wp.com")
    ) {
      return "wordpress-cdn";
    }
  } catch {
    // relative or invalid
  }
  return "external";
}

/** Normalize URL for identity (strip query/hash; lowercase host). */
export function normalizeMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    return trimmed.split("?")[0].split("#")[0];
  }
  try {
    const u = new URL(trimmed);
    const pathname = u.pathname.replace(/\/$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${pathname}`;
  } catch {
    return trimmed.split("?")[0].split("#")[0];
  }
}

export function slugifyMediaBasename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Prefer a stable id from path filename. */
export function mediaIdFromUrl(url: string): string {
  const normalized = normalizeMediaUrl(url);
  let basename = "";
  let yyyymm = "";
  if (normalized.startsWith("/")) {
    basename = path.posix.basename(normalized);
  } else {
    try {
      const u = new URL(normalized);
      const parts = u.pathname.split("/").filter(Boolean);
      basename = parts[parts.length - 1] || "image";
      const uploadsIdx = parts.findIndex((p) => p === "uploads");
      if (uploadsIdx >= 0 && parts[uploadsIdx + 1] && parts[uploadsIdx + 2]) {
        const y = parts[uploadsIdx + 1];
        const m = parts[uploadsIdx + 2];
        if (/^\d{4}$/.test(y) && /^\d{1,2}$/.test(m)) {
          yyyymm = `${y}-${m.padStart(2, "0")}-`;
        }
      }
    } catch {
      basename = "image";
    }
  }
  const base = slugifyMediaBasename(basename) || "image";
  const id = `${yyyymm}${base}`.replace(/^-+|-+$/g, "");
  return id.slice(0, 100) || "image";
}

export function shortHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 6);
}

export function ensureUniqueMediaId(
  preferred: string,
  existingIds: Set<string>,
  url: string,
): string {
  if (!existingIds.has(preferred)) return preferred;
  const withHash = `${preferred}-${shortHash(normalizeMediaUrl(url))}`;
  if (!existingIds.has(withHash)) return withHash;
  let n = 2;
  while (existingIds.has(`${withHash}-${n}`)) n += 1;
  return `${withHash}-${n}`;
}

export function isOwnedUploadUrl(url: string): boolean {
  const n = normalizeMediaUrl(url);
  return n.startsWith("/media/") && !n.includes("..");
}

export function uploadPathFromUrl(url: string): string | null {
  if (!isOwnedUploadUrl(url)) return null;
  const filename = path.posix.basename(normalizeMediaUrl(url));
  if (!filename || filename.includes("..")) return null;
  return `public/media/${filename}`;
}

type FoundImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  used: MediaUsedBy;
};

function extractImgsFromHtml(html: string): Omit<FoundImage, "used">[] {
  const out: Omit<FoundImage, "used">[] = [];
  if (!html) return out;
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const src = /src=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src) continue;
    const alt = /alt=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    const widthRaw = /width=["']?(\d+)/i.exec(tag)?.[1];
    const heightRaw = /height=["']?(\d+)/i.exec(tag)?.[1];
    out.push({
      url: src,
      alt,
      ...(widthRaw ? { width: Number(widthRaw) } : {}),
      ...(heightRaw ? { height: Number(heightRaw) } : {}),
    });
  }
  return out;
}

function scoreUrl(url: string): number {
  let score = url.length;
  if (/[?&]fit=/i.test(url)) score += 1000;
  if (/[?&]w=\d{4}/i.test(url)) score += 500;
  if (!/[?&]resize=/i.test(url)) score += 200;
  return score;
}

/**
 * Scan local posts + pages and merge into a media index.
 * Preserves prior catalog entries; rebuilds usedBy from current content.
 */
export function buildMediaIndexFromContent(
  previous?: MediaIndex | null,
): MediaIndex {
  const postsDir = path.join(process.cwd(), "src/content/posts");
  const pagesDir = path.join(process.cwd(), "src/content/pages");

  const byNorm = new Map<string, MediaItem>();
  const idOwners = new Map<string, string>();

  for (const item of previous?.items || []) {
    if (!item?.url) continue;
    const norm = normalizeMediaUrl(item.url);
    byNorm.set(norm, {
      ...item,
      usedBy: [],
    });
    if (item.id) idOwners.set(item.id, norm);
  }

  function upsert(found: FoundImage) {
    const norm = normalizeMediaUrl(found.url);
    const existing = byNorm.get(norm);
    if (existing) {
      const usedBy = [...(existing.usedBy || [])];
      if (
        !usedBy.some(
          (u) => u.type === found.used.type && u.slug === found.used.slug,
        )
      ) {
        usedBy.push(found.used);
      }
      const preferNew = scoreUrl(found.url) > scoreUrl(existing.url);
      byNorm.set(norm, {
        ...existing,
        url: preferNew ? found.url : existing.url,
        alt: (found.alt && found.alt.trim()) || existing.alt || "",
        width: found.width || existing.width,
        height: found.height || existing.height,
        usedBy,
        source: existing.source || detectMediaSource(found.url),
      });
      return;
    }
    const preferred = mediaIdFromUrl(found.url);
    const id = ensureUniqueMediaId(
      preferred,
      new Set(idOwners.keys()),
      found.url,
    );
    idOwners.set(id, norm);
    byNorm.set(norm, {
      id,
      slug: id,
      url: found.url,
      alt: found.alt || "",
      source: detectMediaSource(found.url),
      ...(found.width ? { width: found.width } : {}),
      ...(found.height ? { height: found.height } : {}),
      usedBy: [found.used],
      createdAt: new Date().toISOString(),
    });
  }

  if (fs.existsSync(postsDir)) {
    for (const file of fs.readdirSync(postsDir)) {
      if (!file.endsWith(".json") || file === "_index.json") continue;
      const post = JSON.parse(
        fs.readFileSync(path.join(postsDir, file), "utf8"),
      ) as {
        slug?: string;
        title?: string;
        featuredImage?: {
          url?: string;
          alt?: string;
          width?: number;
          height?: number;
        };
        contentHtml?: string;
      };
      const slug = post.slug || file.replace(/\.json$/, "");
      const used: MediaUsedBy = { type: "post", slug };
      if (post.featuredImage?.url) {
        upsert({
          url: post.featuredImage.url,
          alt: post.featuredImage.alt || post.title || "",
          width: post.featuredImage.width,
          height: post.featuredImage.height,
          used,
        });
      }
      for (const img of extractImgsFromHtml(post.contentHtml || "")) {
        upsert({ ...img, used });
      }
    }
  }

  if (fs.existsSync(pagesDir)) {
    for (const file of fs.readdirSync(pagesDir)) {
      if (!file.endsWith(".json") || file === "_index.json") continue;
      const page = JSON.parse(
        fs.readFileSync(path.join(pagesDir, file), "utf8"),
      ) as { slug?: string; contentHtml?: string };
      const slug = page.slug || file.replace(/\.json$/, "");
      const used: MediaUsedBy = { type: "page", slug };
      for (const img of extractImgsFromHtml(page.contentHtml || "")) {
        upsert({ ...img, used });
      }
    }
  }

  const yearKey = (id: string) => {
    const m = /^(\d{4}-\d{2})/.exec(id || "");
    return m ? m[1] : "0000-00";
  };

  const items = [...byNorm.values()].sort((a, b) => {
    const y = yearKey(b.id).localeCompare(yearKey(a.id));
    if (y !== 0) return y;
    const da =
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime();
    if (da !== 0) return da;
    return (b.id || "").localeCompare(a.id || "");
  });

  return {
    updatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
}
