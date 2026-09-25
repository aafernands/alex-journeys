import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { postSlugRedirects } from "../src/data/post-slug-redirects.ts";
import {
  isPostIndexable,
  noindexRobots,
  optionalSeoFields,
  readNoindex,
  readSeoFields,
  resolvedSeoDescription,
  resolvedSeoTitle,
} from "../src/lib/post-seo.ts";
import { auditPostSeo } from "../src/lib/seo-audit.ts";
import { getSiteUrl } from "../src/lib/site-url.ts";

const NOW = new Date("2026-09-25T12:00:00.000Z");
const CATALOG = {
  postSlugs: ["other-story", "current-story"],
  destinationSlugs: ["iceland"],
  guideSlugs: ["plan-a-trip"],
};

function words(count) {
  return Array.from({ length: count }, () => "travel").join(" ");
}

function healthyHtml() {
  return `<p>${words(40)}</p><h2>On the road</h2><p>${words(580)}</p><p><a href="/iceland">Iceland</a></p><img src="/media/lake.jpg" alt="Maroon Lake at sunrise" />`;
}

function baseInput(overrides = {}) {
  return {
    slug: "current-story",
    title: "Sunrise at the lake",
    excerpt: "A clear morning on the water, with the peaks turning gold before the crowds arrive.",
    contentHtml: healthyHtml(),
    featuredImage: {
      url: "/media/lake.jpg",
      alt: "Still lake reflecting orange peaks",
    },
    ...overrides,
  };
}

function status(audit, id) {
  const check = audit.checks.find((item) => item.id === id);
  assert.ok(check, `missing check ${id}`);
  return check.status;
}

describe("site url", () => {
  it("defaults to https://www.alexjourneys.com", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(getSiteUrl(), "https://www.alexjourneys.com");
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.com/";
    assert.equal(getSiteUrl(), "https://preview.example.com");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  });
});

describe("resolved post SEO", () => {
  it("falls back to the post title and excerpt", () => {
    assert.equal(
      resolvedSeoTitle({ title: "Hello", seoTitle: "  " }),
      "Hello",
    );
    assert.equal(
      resolvedSeoDescription({ title: "Hello", excerpt: "Excerpt", seoDescription: "" }),
      "Excerpt",
    );
  });

  it("prefers custom SEO fields", () => {
    assert.equal(
      resolvedSeoTitle({ title: "Hello", seoTitle: "Custom title" }),
      "Custom title",
    );
    assert.equal(
      resolvedSeoDescription({
        title: "Hello",
        excerpt: "Excerpt",
        seoDescription: "Custom description",
      }),
      "Custom description",
    );
  });
});

describe("auditPostSeo", () => {
  it("scores a complete story highly", () => {
    const audit = auditPostSeo(baseInput(), { catalog: CATALOG, now: NOW });
    assert.equal(status(audit, "seo-title"), "pass");
    assert.equal(status(audit, "meta-description"), "pass");
    assert.equal(status(audit, "image-alt"), "pass");
    assert.equal(status(audit, "hero-alt"), "pass");
    assert.equal(status(audit, "intro"), "pass");
    assert.equal(status(audit, "headings-h2"), "pass");
    assert.equal(status(audit, "internal-links"), "pass");
    assert.equal(status(audit, "migration-junk"), "pass");
    assert.ok(audit.score >= 90);
    assert.equal(audit.issues.length, 0);
  });

  it("warns when the SEO title or description run past the target", () => {
    const audit = auditPostSeo(
      baseInput({
        seoTitle: "x".repeat(61),
        seoDescription: "y".repeat(156),
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(audit, "seo-title"), "warn");
    assert.equal(status(audit, "meta-description"), "warn");
    assert.ok(audit.issues.some((issue) => issue.includes("61")));
    assert.ok(audit.issues.some((issue) => issue.includes("156")));
  });

  it("fails a description that ends in a truncated ellipsis", () => {
    const bracket = auditPostSeo(
      baseInput({ excerpt: "A truncated excerpt [&hellip;]" }),
      { catalog: CATALOG, now: NOW },
    );
    const unicode = auditPostSeo(
      baseInput({ seoDescription: "A truncated excerpt […]" }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(bracket, "description-ellipsis"), "fail");
    assert.equal(status(unicode, "description-ellipsis"), "fail");
    const cleanOverride = auditPostSeo(
      baseInput({
        excerpt: "A truncated excerpt [&hellip;]",
        seoDescription: "A finished description of the trip.",
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(cleanOverride, "description-ellipsis"), "pass");
  });

  it("flags missing alts, title alts, and filename alts", () => {
    const missing = auditPostSeo(
      baseInput({
        contentHtml: `${healthyHtml()}<img src="/media/extra.jpg">`,
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(missing, "image-alt"), "fail");

    const titled = auditPostSeo(
      baseInput({
        featuredImage: { url: "/media/lake.jpg", alt: "Sunrise at the lake" },
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(titled, "hero-alt"), "warn");

    const fileName = auditPostSeo(
      baseInput({
        featuredImage: { url: "/media/lake.jpg", alt: "pexels-photo-123.jpeg" },
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(fileName, "hero-alt"), "fail");
  });

  it("flags missing intros and heading problems", () => {
    const noIntro = auditPostSeo(
      baseInput({
        contentHtml: `<h2>Start</h2><p>${words(620)}</p><a href="/other-story">More</a>`,
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(noIntro, "intro"), "fail");

    const noH2 = auditPostSeo(
      baseInput({
        contentHtml: `<p>${words(40)}</p><h3>Only a subhead</h3><p>${words(580)}</p><a href="/guides/plan-a-trip">Plan</a>`,
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(noH2, "headings-h2"), "fail");

    const skip = auditPostSeo(
      baseInput({
        contentHtml: `<p>${words(40)}</p><h2>Section</h2><h4>Too deep</h4><p>${words(580)}</p><a href="https://www.alexjourneys.com/other-story">More</a>`,
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(skip, "headings-hierarchy"), "fail");
    assert.match(skip.checks.find((item) => item.id === "headings-hierarchy").detail, /H4 follows H2/);

    const bold = auditPostSeo(
      baseInput({
        contentHtml: `${healthyHtml()}<p><strong>What to pack</strong></p>`,
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(bold, "pseudo-headings"), "warn");
  });

  it("requires an internal link to a post, destination, or guide", () => {
    const none = auditPostSeo(
      baseInput({
        contentHtml: `<p>${words(40)}</p><h2>Section</h2><p>${words(580)}</p><a href="https://example.com/iceland">Out</a>`,
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(none, "internal-links"), "fail");

    const guide = auditPostSeo(
      baseInput({
        contentHtml: `<p>${words(40)}</p><h2>Section</h2><p>${words(580)}</p><a href="/guides/plan-a-trip">Plan</a>`,
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(guide, "internal-links"), "pass");
  });

  it("flags past years in the title during 2026", () => {
    const stale = auditPostSeo(
      baseInput({ title: "Top adventures for 2025" }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(stale, "stale-year"), "fail");
    assert.match(stale.issues.join(" "), /2025/);

    const current = auditPostSeo(
      baseInput({ title: "Trips to take in 2026", seoTitle: "Trips to take in 2026" }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(current, "stale-year"), "pass");
  });

  it("flags thin stories and migration leftovers without blocking shape", () => {
    const thin = auditPostSeo(
      baseInput({ contentHtml: "<p>Short note.</p>" }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(thin, "word-count"), "fail");

    const junk = auditPostSeo(
      baseInput({
        contentHtml: `${healthyHtml()}<p>[acf-field] SEO Tips for Yoast In-Content Ads: Test Link {ifnull(x)} ![alt](photo.jpg) Instagram emmbbed</p>`,
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(junk, "migration-junk"), "fail");
    const detail = junk.checks.find((item) => item.id === "migration-junk").detail;
    for (const bit of ["[acf-", "Yoast", "In-Content Ads", "Test Link", "{ifnull(", "markdown", "emmbbed"]) {
      assert.match(detail, new RegExp(bit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.equal(typeof junk.score, "number");
  });

  it("warns when a focus keyword misses the title or description", () => {
    const missing = auditPostSeo(
      baseInput({ focusKeyword: "Reykjavik" }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(missing, "focus-keyword"), "warn");
    const hit = auditPostSeo(
      baseInput({
        seoTitle: "Reykjavik in a week",
        seoDescription: "How I spent a week in Reykjavik.",
        focusKeyword: "Reykjavik",
      }),
      { catalog: CATALOG, now: NOW },
    );
    assert.equal(status(hit, "focus-keyword"), "pass");
  });
});

describe("readSeoFields", () => {
  it("trims SEO fields and omits blanks from published JSON", () => {
    const saved = readSeoFields({
      seoTitle: "  Custom title  ",
      seoDescription: "Custom description",
      focusKeyword: "  iceland  ",
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal(saved.seoTitle, "Custom title");
    assert.deepEqual(optionalSeoFields(saved), {
      seoTitle: "Custom title",
      seoDescription: "Custom description",
      focusKeyword: "iceland",
    });
    assert.deepEqual(
      optionalSeoFields({ seoTitle: "", seoDescription: "", focusKeyword: "" }),
      {},
    );
    assert.equal(readNoindex(true), true);
    assert.equal(readNoindex("true"), true);
    assert.equal(readNoindex(false), false);
    assert.equal(readNoindex("false"), false);
    assert.deepEqual(
      optionalSeoFields({
        seoTitle: "",
        seoDescription: "",
        focusKeyword: "",
        noindex: true,
      }),
      { noindex: true },
    );
    assert.deepEqual(noindexRobots(), {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    });
    assert.equal(isPostIndexable({}), true);
    assert.equal(isPostIndexable({ noindex: false }), true);
    assert.equal(isPostIndexable({ noindex: true }), false);
  });

  it("allows titles past the checklist target and rejects extreme length", () => {
    assert.equal(readSeoFields({ seoTitle: "x".repeat(61) }).ok, true);
    const tooLong = readSeoFields({ seoTitle: "x".repeat(181) });
    assert.equal(tooLong.ok, false);
  });
});

describe("published SEO fixes", () => {
  it("redirects the misspelled Maroon Bells slug", () => {
    const hit = postSlugRedirects.find((item) => item.source === "/marron-bells");
    assert.ok(hit);
    assert.equal(hit.destination, "/maroon-bells");
    const config = fs.readFileSync("next.config.ts", "utf8");
    assert.match(config, /postSlugRedirects/);
    assert.match(config, /permanent:\s*true/);
  });

  it("publishes Maroon Bells at /maroon-bells", () => {
    assert.equal(fs.existsSync("src/content/posts/marron-bells.json"), false);
    const post = JSON.parse(fs.readFileSync("src/content/posts/maroon-bells.json", "utf8"));
    assert.equal(post.slug, "maroon-bells");
    const index = JSON.parse(fs.readFileSync("src/content/posts/_index.json", "utf8"));
    assert.equal(index.posts.some((item) => item.slug === "marron-bells"), false);
    assert.equal(index.posts.some((item) => item.slug === "maroon-bells"), true);
    assert.ok(index.featuredHomepage.includes("maroon-bells"));
  });

  it("points the Iceland mentions at the real slug", () => {
    for (const file of [
      "src/content/posts/top-10-must-visit-european-cities.json",
      "src/content/posts/top-adventure-travel-destinations-for-2025.json",
    ]) {
      const raw = fs.readFileSync(file, "utf8");
      assert.equal(raw.includes("discovering-iceland/"), false);
      assert.ok(
        raw.includes(
          "https://www.alexjourneys.com/discovering-iceland-a-week-in-the-land-of-fire-and-ice",
        ),
      );
    }
  });
});
