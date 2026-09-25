/**
 * One-shot migration: WordPress REST JSON → cleaned post JSON under src/content/posts/
 * Source: /workspace/wp-migration/all-posts.json (alexjournly.com)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE = "/workspace/wp-migration/all-posts.json";
const OUT_DIR = path.join(ROOT, "src/content/posts");

/** WordPress slug → published slug. Maroon Bells was imported with a typo. */
const SLUG_RENAMES = {
  "marron-bells": "maroon-bells",
};

const DESTINATION_MAP = {
  "cancun-5-day-travel-guide": ["mexico"],
  "marron-bells": ["united-states"],
  "discovering-iceland-a-week-in-the-land-of-fire-and-ice": ["iceland"],
  "rio-de-janeiro-itinerary": ["brazil"],
  "toronto-travel-guide": ["canada"],
  "the-ultimate-insiders-guide-to-u-s-ski-destinations": ["united-states"],
  "nj-wine-expo-2024": ["united-states"],
  "real-id-requirements-2025": ["united-states"],
  "nuuk-airport-opening": ["iceland"], // Greenland gateway / Nordic travel
};

const FEATURED_HOMEPAGE = [
  "cancun-5-day-travel-guide",
  "discovering-iceland-a-week-in-the-land-of-fire-and-ice",
  "rio-de-janeiro-itinerary",
  "toronto-travel-guide",
  "maroon-bells",
  "best-solo-travel-destinations",
];

function decodeEntities(str) {
  return str
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

const VIATOR_WIDGET_DIV_RE =
  /<div\b[^>]*\bdata-vi-widget-ref\s*=\s*(["'])[^"']+\1[^>]*>\s*<\/div>/gi;
const VIATOR_WIDGET_SCRIPT_RE =
  /<script\b[^>]*\bsrc\s*=\s*(["'])https?:\/\/www\.viator\.com\/orion\/partner\/widget\.js\1[^>]*>\s*<\/script>/gi;

function cleanHtml(html) {
  let h = html;

  // Hold partner embeds aside so the tag allow-list does not drop the empty divs.
  // Reset lastIndex — these patterns are global and reused across calls.
  VIATOR_WIDGET_DIV_RE.lastIndex = 0;
  VIATOR_WIDGET_SCRIPT_RE.lastIndex = 0;
  const viatorSlots = [];
  h = h.replace(VIATOR_WIDGET_DIV_RE, (markup) => {
    const token = `VIATORWIDGETSLOT${viatorSlots.length}END`;
    viatorSlots.push(markup);
    return `<p>${token}</p>`;
  });
  h = h.replace(VIATOR_WIDGET_SCRIPT_RE, (markup) => {
    const token = `VIATORWIDGETSLOT${viatorSlots.length}END`;
    viatorSlots.push(markup);
    return `<p>${token}</p>`;
  });

  // Remove scripts, noscript, style blocks, tracking pixels (1x1), WP embeds junk
  h = h.replace(/<script[\s\S]*?<\/script>/gi, "");
  h = h.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  h = h.replace(/<style[\s\S]*?<\/style>/gi, "");
  h = h.replace(/<!--[\s\S]*?-->/g, "");

  // Strip event handlers
  h = h.replace(/\s+on\w+=(?:"[^"]*"|'[^']*')/gi, "");

  // Remove tracking / 1x1 images
  h = h.replace(
    /<img[^>]*(?:width=["']1["']|height=["']1["'])[^>]*>/gi,
    "",
  );

  // Clean img tags: keep src, alt, width, height; drop data-* and srcset noise if messy
  h = h.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
    const src =
      attrs.match(/\ssrc=["']([^"']+)["']/i)?.[1] ||
      attrs.match(/\sdata-src=["']([^"']+)["']/i)?.[1];
    if (!src) return "";
    let cleanSrc = decodeEntities(src).replace(/&amp;/g, "&");
    // Drop broken WordPress local/temp upload paths
    if (
      cleanSrc.startsWith("file:") ||
      cleanSrc.startsWith("///") ||
      cleanSrc.includes("/private/var/") ||
      cleanSrc.includes("org.automattic")
    ) {
      return "";
    }
    const alt = attrs.match(/\salt=["']([^"']*)["']/i)?.[1] || "";
    const width = attrs.match(/\swidth=["'](\d+)["']/i)?.[1];
    const height = attrs.match(/\sheight=["'](\d+)["']/i)?.[1];
    const parts = [`src="${cleanSrc}"`, `alt="${decodeEntities(alt)}"`];
    if (width) parts.push(`width="${width}"`);
    if (height) parts.push(`height="${height}"`);
    parts.push('loading="lazy"');
    return `<img ${parts.join(" ")} />`;
  });

  // Simplify figure: keep figure > img + optional figcaption
  h = h.replace(/<figure\b([^>]*)>/gi, "<figure>");
  h = h.replace(/<\/?figcaption\b([^>]*)>/gi, (m) =>
    m.startsWith("</") ? "</figcaption>" : "<figcaption>",
  );

  // Headings / paragraphs / lists — strip WP classes and inline styles
  const keepTags = [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "strong",
    "em",
    "b",
    "i",
    "br",
    "hr",
    "figure",
    "figcaption",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "code",
    "pre",
  ];

  // Remove disallowed tags but keep children
  h = h.replace(
    /<\/?([a-z0-9]+)(\s[^>]*)?>/gi,
    (full, tag, attrs = "") => {
      const t = tag.toLowerCase();
      if (!keepTags.includes(t)) {
        return "";
      }
      if (full.startsWith("</")) return `</${t}>`;
      if (t === "br" || t === "hr" || t === "img") {
        // already handled img; br/hr self-close
        if (t === "img") return full; // already rewritten
        return `<${t} />`;
      }
      if (t === "a") {
        const href = attrs.match(/\shref=["']([^"']+)["']/i)?.[1];
        if (!href) return "";
        const cleanHref = decodeEntities(href);
        const rel = cleanHref.startsWith("http")
          ? ' rel="noopener noreferrer" target="_blank"'
          : "";
        return `<a href="${cleanHref}"${rel}>`;
      }
      // Strip all attributes from other keep tags (classes, styles, ids)
      return `<${t}>`;
    },
  );

  // Collapse empty paragraphs and excess whitespace
  h = h.replace(/<p>\s*<\/p>/gi, "");
  h = h.replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, "");
  h = h.replace(/<figure>\s*<\/figure>/gi, "");
  h = h.replace(/\n{3,}/g, "\n\n");
  h = h.replace(/(<\/p>)\s*(<p>)/gi, "$1\n$2");
  h = h.replace(/(<\/h[1-6]>)\s*/gi, "$1\n");
  h = decodeEntities(h).trim();

  viatorSlots.forEach((markup, index) => {
    h = h.replace(`<p>VIATORWIDGETSLOT${index}END</p>`, markup);
  });

  return h;
}

function pickFeaturedImage(post) {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  const url =
    post.jetpack_featured_media_url ||
    media?.source_url ||
    null;
  if (!url) return null;
  return {
    url: decodeEntities(url),
    alt: media?.alt_text || stripTags(post.title?.rendered || "") || "",
    width: media?.media_details?.width || undefined,
    height: media?.media_details?.height || undefined,
  };
}

function main() {
  const raw = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("No posts found in source JSON");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Clear old post files
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith(".json")) fs.unlinkSync(path.join(OUT_DIR, f));
  }

  const index = [];
  const cleanupNotes = [];

  for (const post of raw) {
    const sourceSlug = post.slug;
    const slug = SLUG_RENAMES[sourceSlug] || sourceSlug;
    const title = decodeEntities(stripTags(post.title?.rendered || ""));
    const excerpt = stripTags(post.excerpt?.rendered || "");
    const date = post.date; // preserve original
    const originalHtml = post.content?.rendered || "";
    const hadScripts = /<script/i.test(originalHtml);
    const hadStyles = /style=/i.test(originalHtml);
    const contentHtml = cleanHtml(originalHtml);
    const featuredImage = pickFeaturedImage(post);
    const destinations = DESTINATION_MAP[sourceSlug] || DESTINATION_MAP[slug] || [];

    if (hadScripts || hadStyles) {
      cleanupNotes.push({
        slug,
        scripts: hadScripts,
        inlineStyles: hadStyles,
      });
    }

    const record = {
      slug,
      title,
      date,
      excerpt,
      featuredImage,
      destinations,
      contentHtml,
      source: {
        site: "https://alexjournly.com",
        url: post.link || `https://alexjournly.com/${slug}/`,
        wpId: post.id,
      },
    };

    fs.writeFileSync(
      path.join(OUT_DIR, `${slug}.json`),
      JSON.stringify(record, null, 2) + "\n",
    );

    index.push({
      slug,
      title,
      date,
      excerpt,
      featuredImage,
      destinations,
    });
  }

  // Sort index by date desc
  index.sort((a, b) => (a.date < b.date ? 1 : -1));

  fs.writeFileSync(
    path.join(OUT_DIR, "_index.json"),
    JSON.stringify(
      {
        migratedAt: new Date().toISOString(),
        source: "alexjournly.com WordPress REST API",
        count: index.length,
        featuredHomepage: FEATURED_HOMEPAGE,
        posts: index,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`Migrated ${index.length} posts → ${OUT_DIR}`);
  console.log("Heavy cleanup:", cleanupNotes);
  console.log("Featured homepage:", FEATURED_HOMEPAGE);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main();
}

export { cleanHtml };
