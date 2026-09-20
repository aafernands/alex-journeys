/**
 * Scan posts + pages for images and upsert src/content/media/_index.json
 * Usage: node scripts/seed-media-library.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "src/content/posts");
const PAGES_DIR = path.join(ROOT, "src/content/pages");
const OUT_PATH = path.join(ROOT, "src/content/media/_index.json");

function normalizeMediaUrl(url) {
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

function detectMediaSource(url) {
  const trimmed = url.trim();
  if (trimmed.startsWith("/media/")) return "upload";
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
    /* ignore */
  }
  return "external";
}

function slugifyMediaBasename(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function shortHash(input) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 6);
}

function mediaIdFromUrl(url) {
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
  return `${yyyymm}${base}`.replace(/^-+|-+$/g, "").slice(0, 100) || "image";
}

function ensureUniqueMediaId(preferred, existingIds, url) {
  if (!existingIds.has(preferred)) return preferred;
  const withHash = `${preferred}-${shortHash(normalizeMediaUrl(url))}`;
  if (!existingIds.has(withHash)) return withHash;
  let n = 2;
  while (existingIds.has(`${withHash}-${n}`)) n += 1;
  return `${withHash}-${n}`;
}

function extractImgsFromHtml(html) {
  const out = [];
  if (!html) return out;
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const src = /src=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src) continue;
    const alt = /alt=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    const width = Number(/width=["']?(\d+)/i.exec(tag)?.[1]) || undefined;
    const height = Number(/height=["']?(\d+)/i.exec(tag)?.[1]) || undefined;
    out.push({ url: src, alt, width, height });
  }
  return out;
}

function scoreUrl(url) {
  // Prefer larger / unresized variants when merging duplicates by normalized path
  let score = url.length;
  if (/[?&]fit=/i.test(url)) score += 1000;
  if (/[?&]w=\d{4}/i.test(url)) score += 500;
  if (!/[?&]resize=/i.test(url)) score += 200;
  return score;
}

function loadExisting() {
  if (!fs.existsSync(OUT_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function main() {
  /** @type {Map<string, object>} */
  const byNorm = new Map();
  const existing = loadExisting();
  for (const item of existing) {
    if (!item?.url) continue;
    byNorm.set(normalizeMediaUrl(item.url), { ...item, usedBy: [...(item.usedBy || [])] });
  }

  const idOwners = new Map(); // id -> normUrl
  for (const [norm, item] of byNorm) {
    if (item.id) idOwners.set(item.id, norm);
  }

  function upsert({ url, alt, width, height, used }) {
    const norm = normalizeMediaUrl(url);
    const existingItem = byNorm.get(norm);
    if (existingItem) {
      const nextUsed = [...(existingItem.usedBy || [])];
      if (used && !nextUsed.some((u) => u.type === used.type && u.slug === used.slug)) {
        nextUsed.push(used);
      }
      const preferNewUrl = scoreUrl(url) > scoreUrl(existingItem.url);
      byNorm.set(norm, {
        ...existingItem,
        url: preferNewUrl ? url : existingItem.url,
        alt: (alt && alt.trim()) || existingItem.alt || "",
        width: width || existingItem.width,
        height: height || existingItem.height,
        usedBy: nextUsed,
        source: existingItem.source || detectMediaSource(url),
      });
      return;
    }

    const preferred = mediaIdFromUrl(url);
    const taken = new Set(idOwners.keys());
    const id = ensureUniqueMediaId(preferred, taken, url);
    idOwners.set(id, norm);
    const now = new Date().toISOString();
    byNorm.set(norm, {
      id,
      slug: id,
      url,
      alt: alt || "",
      source: detectMediaSource(url),
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      usedBy: used ? [used] : [],
      createdAt: now,
    });
  }

  // Posts
  const postFiles = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".json") && f !== "_index.json");
  for (const file of postFiles) {
    const post = JSON.parse(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"));
    const slug = post.slug || file.replace(/\.json$/, "");
    const used = { type: "post", slug };
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

  // Pages
  const pageFiles = fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "_index.json");
  for (const file of pageFiles) {
    const page = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, file), "utf8"));
    const slug = page.slug || file.replace(/\.json$/, "");
    const used = { type: "page", slug };
    for (const img of extractImgsFromHtml(page.contentHtml || "")) {
      upsert({ ...img, used });
    }
  }

  const items = [...byNorm.values()].sort((a, b) => {
    // Prefer path-year in id (YYYY-MM-...) then createdAt then id
    const yearKey = (id) => {
      const m = /^(\d{4}-\d{2})/.exec(id || "");
      return m ? m[1] : "0000-00";
    };
    const y = yearKey(b.id).localeCompare(yearKey(a.id));
    if (y !== 0) return y;
    const da = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    if (da !== 0) return da;
    return (b.id || "").localeCompare(a.id || "");
  });

  const index = {
    updatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Wrote ${items.length} media items → ${path.relative(ROOT, OUT_PATH)}`);
  const bySource = items.reduce((acc, i) => {
    acc[i.source] = (acc[i.source] || 0) + 1;
    return acc;
  }, {});
  console.log("By source:", bySource);
}

main();
