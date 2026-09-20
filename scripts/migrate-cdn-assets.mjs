/**
 * Download all WordPress/Jetpack CDN images into public/media/migrated/
 * and rewrite references in posts, pages, content.ts, destinations, drafts, media index.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/media/migrated");
const UA =
  "FernandesJourneysMediaMigrator/1.0 (+https://www.fernandesjourneys.com; hello@alexjournly.com)";
const CONCURRENCY = 6;
const MAX_EDGE = 2000;
const QUALITY = 82;
const RETRIES = 3;

const URL_RE =
  /https?:\/\/(?:i[0-3]\.wp\.com|(?:www\.)?(?:alexjournly|fernandesjourneys)\.com)[^\s"'<>\\)]+/gi;

const SCAN_GLOBS = [
  "src/content/posts",
  "src/content/pages",
  "src/content/drafts",
  "src/content/destinations",
  "src/content/media",
  "src/data",
];

function isImageUrl(url) {
  const lower = url.toLowerCase();
  if (/\/wp-content\/uploads\//.test(lower)) return true;
  if (/\.(jpe?g|png|webp|gif|avif|bmp|tiff?)(\?|$)/i.test(lower)) return true;
  if (/i[0-3]\.wp\.com/i.test(lower)) return true;
  return false;
}

function collectUrls() {
  const urls = new Set();
  for (const rel of SCAN_GLOBS) {
    const dir = path.join(ROOT, rel);
    if (!fs.existsSync(dir)) continue;
    const walk = (d) => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (/\.(json|ts|tsx|js|mjs|md)$/.test(ent.name)) {
          const text = fs.readFileSync(p, "utf8");
          for (const m of text.matchAll(URL_RE)) {
            let u = m[0].replace(/\\+$/, "").replace(/&amp;/g, "&");
            // trim trailing punctuation from JSON escapes
            u = u.replace(/\\+$/, "");
            if (isImageUrl(u)) urls.add(u);
          }
        }
      }
    };
    if (fs.statSync(dir).isDirectory()) walk(dir);
    else {
      const text = fs.readFileSync(dir, "utf8");
      for (const m of text.matchAll(URL_RE)) {
        let u = m[0].replace(/\\+$/, "").replace(/&amp;/g, "&");
        if (isImageUrl(u)) urls.add(u);
      }
    }
  }
  return [...urls];
}

/** Prefer origin host path; strip photon resize params for better quality. */
function candidateUrls(original) {
  const out = [];
  try {
    const u = new URL(original);
    const host = u.hostname.toLowerCase();
    if (/^i[0-3]\.wp\.com$/.test(host)) {
      // path is /alexjournly.com/wp-content/...
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const originHost = parts[0];
        const rest = "/" + parts.slice(1).join("/");
        out.push(`https://${originHost}${rest}`);
        // photon without size params
        out.push(`https://${host}/${originHost}${rest}?ssl=1`);
      }
    } else {
      // direct origin — try clean path
      out.push(`${u.protocol}//${u.host}${u.pathname}`);
    }
  } catch {
    /* ignore */
  }
  out.push(original);
  return [...new Set(out)];
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function shortHash(input) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 8);
}

function filenameForUrl(url) {
  let pathname = "";
  let yyyymm = "";
  try {
    const u = new URL(url);
    let p = u.pathname;
    // strip i0.wp.com/host prefix
    if (/^i[0-3]\.wp\.com$/i.test(u.hostname)) {
      const parts = p.split("/").filter(Boolean);
      if (parts.length >= 2) p = "/" + parts.slice(1).join("/");
    }
    pathname = p;
    const parts = p.split("/").filter(Boolean);
    const up = parts.indexOf("uploads");
    if (up >= 0 && parts[up + 1] && parts[up + 2]) {
      const y = parts[up + 1];
      const m = parts[up + 2];
      if (/^\d{4}$/.test(y) && /^\d{1,2}$/.test(m)) {
        yyyymm = `${y}-${m.padStart(2, "0")}-`;
      }
    }
  } catch {
    pathname = url;
  }
  const base = path.posix.basename(pathname.split("?")[0]) || "image";
  const extMatch = base.match(/\.(jpe?g|png|webp|gif|avif)$/i);
  let ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";
  if (ext === ".jpeg") ext = ".jpg";
  const slug = slugify(base) || "image";
  const hash = shortHash(url.split("?")[0]);
  return `${yyyymm}${slug}-${hash}${ext}`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/*,*/*;q=0.8",
      Referer: "https://www.fernandesjourneys.com/",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct && !ct.includes("image") && !ct.includes("octet-stream") && !ct.includes("webp")) {
    // still allow if body looks like image
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function downloadOne(url) {
  const candidates = candidateUrls(url);
  let lastErr;
  for (const cand of candidates) {
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        const buf = await fetchBuffer(cand);
        if (buf.length < 100) throw new Error("too small");
        return { buf, from: cand };
      } catch (e) {
        lastErr = e;
        if (e.status === 404) break; // try next candidate
        await sleep(400 * attempt);
      }
    }
  }
  throw lastErr || new Error("download failed");
}

async function maybeOptimize(buf, destPath) {
  try {
    const img = sharp(buf, { failOn: "none" });
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    const maxDim = Math.max(w, h);
    const fmt = (meta.format || "").toLowerCase();
    // Keep originals if already reasonable size
    if (maxDim <= MAX_EDGE && buf.length < 1_800_000) {
      fs.writeFileSync(destPath, buf);
      return { width: w, height: h, bytes: buf.length, optimized: false };
    }
    let pipeline = sharp(buf, { failOn: "none" }).rotate();
    if (maxDim > MAX_EDGE) {
      pipeline = pipeline.resize({
        width: w >= h ? MAX_EDGE : undefined,
        height: h > w ? MAX_EDGE : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    const outExt = path.extname(destPath).toLowerCase();
    let out;
    if (outExt === ".png" && (fmt === "png" || fmt === "gif")) {
      out = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    } else if (outExt === ".webp" || fmt === "webp") {
      // keep webp
      const target = destPath.replace(/\.[^.]+$/, ".webp");
      out = await pipeline.webp({ quality: QUALITY }).toBuffer();
      fs.writeFileSync(target, out);
      const m2 = await sharp(out).metadata();
      return {
        width: m2.width,
        height: m2.height,
        bytes: out.length,
        optimized: true,
        path: target,
      };
    } else {
      out = await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
      if (outExt !== ".jpg" && outExt !== ".jpeg") {
        const target = destPath.replace(/\.[^.]+$/, ".jpg");
        fs.writeFileSync(target, out);
        const m2 = await sharp(out).metadata();
        return {
          width: m2.width,
          height: m2.height,
          bytes: out.length,
          optimized: true,
          path: target,
        };
      }
    }
    fs.writeFileSync(destPath, out);
    const m2 = await sharp(out).metadata();
    return {
      width: m2.width,
      height: m2.height,
      bytes: out.length,
      optimized: true,
    };
  } catch (e) {
    // fallback: write raw
    fs.writeFileSync(destPath, buf);
    return { width: 0, height: 0, bytes: buf.length, optimized: false, error: String(e) };
  }
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function localUrlFromFilename(filename) {
  return `/media/migrated/${filename}`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const urls = collectUrls();
  console.log(`Found ${urls.length} unique image CDN URLs`);

  const mapping = new Map(); // original url -> local path
  const failed = [];
  const downloaded = [];

  const results = await mapPool(urls, CONCURRENCY, async (url, idx) => {
    const preferredName = filenameForUrl(url);
    let destPath = path.join(OUT_DIR, preferredName);
    // if already downloaded under same preferred name from a previous run
    try {
      const { buf, from } = await downloadOne(url);
      const opt = await maybeOptimize(buf, destPath);
      const finalPath = opt.path || destPath;
      const filename = path.basename(finalPath);
      const local = localUrlFromFilename(filename);
      console.log(
        `[${idx + 1}/${urls.length}] OK ${filename} (${(opt.bytes / 1024).toFixed(0)}KB${opt.optimized ? ", resized" : ""}) from ${from.slice(0, 80)}`
      );
      return { url, local, filename, ok: true, bytes: opt.bytes, width: opt.width, height: opt.height };
    } catch (e) {
      console.warn(`[${idx + 1}/${urls.length}] FAIL ${url.slice(0, 100)} — ${e.message || e}`);
      return { url, ok: false, error: String(e.message || e) };
    }
  });

  for (const r of results) {
    if (r.ok) {
      mapping.set(r.url, r.local);
      downloaded.push(r);
    } else {
      failed.push(r);
    }
  }

  // Also map URL variants that normalize to same asset path without query
  // Rewrite files
  const rewriteRoots = [
    "src/content/posts",
    "src/content/pages",
    "src/content/drafts",
    "src/content/destinations",
    "src/data/content.ts",
  ];

  let filesTouched = 0;
  let postsRewritten = 0;
  let pagesRewritten = 0;

  function rewriteText(text) {
    let out = text;
    // Replace longest URLs first to avoid partial overlaps
    const entries = [...mapping.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [remote, local] of entries) {
      if (out.includes(remote)) {
        out = out.split(remote).join(local);
      }
      // Also escaped ampersands variant
      const amp = remote.replace(/&/g, "&amp;");
      if (amp !== remote && out.includes(amp)) {
        out = out.split(amp).join(local);
      }
      // JSON-escaped backslash before ?
      // handle \" ending already covered by exact match
    }
    return out;
  }

  function walkRewrite(target) {
    const full = path.join(ROOT, target);
    if (!fs.existsSync(full)) return;
    const st = fs.statSync(full);
    if (st.isFile()) {
      const before = fs.readFileSync(full, "utf8");
      const after = rewriteText(before);
      if (after !== before) {
        fs.writeFileSync(full, after);
        filesTouched++;
        if (target.includes("/posts/") && target.endsWith(".json")) postsRewritten++;
        if (target.includes("/pages/") && target.endsWith(".json")) pagesRewritten++;
      }
      return;
    }
    for (const ent of fs.readdirSync(full, { withFileTypes: true })) {
      if (ent.name.startsWith(".")) continue;
      walkRewrite(path.join(target, ent.name));
    }
  }

  for (const r of rewriteRoots) walkRewrite(r);

  // Update media index
  const indexPath = path.join(ROOT, "src/content/media/_index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  let indexUpdated = 0;
  for (const item of index.items || []) {
    if (mapping.has(item.url)) {
      item.url = mapping.get(item.url);
      item.source = "upload";
      indexUpdated++;
    } else if (typeof item.url === "string" && /i[0-3]\.wp\.com|alexjournly\.com\/wp-content|fernandesjourneys\.com\/wp-content/i.test(item.url)) {
      // try match by stripping query
      const bare = item.url.split("?")[0];
      for (const [remote, local] of mapping) {
        if (remote.split("?")[0] === bare || remote === item.url) {
          item.url = local;
          item.source = "upload";
          indexUpdated++;
          break;
        }
      }
    }
  }
  index.updatedAt = new Date().toISOString();
  index.count = (index.items || []).length;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");

  // Manifest for report
  const manifest = {
    downloaded: downloaded.length,
    failed: failed.length,
    failedUrls: failed.map((f) => ({ url: f.url, error: f.error })),
    filesTouched,
    postsRewritten,
    pagesRewritten,
    indexUpdated,
    mapping: Object.fromEntries(mapping),
    totalBytes: downloaded.reduce((s, d) => s + d.bytes, 0),
  };
  fs.writeFileSync(
    path.join(ROOT, "scripts/.cdn-migrate-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify({
    downloaded: manifest.downloaded,
    failed: manifest.failed,
    filesTouched,
    postsRewritten,
    pagesRewritten,
    indexUpdated,
    totalMB: (manifest.totalBytes / 1024 / 1024).toFixed(2),
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
