/**
 * Lightweight checks for featured slideshow decoupling.
 * Run: node scripts/check-featured-slideshow.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const design = JSON.parse(
  readFileSync(join(root, "src/data/site-design.json"), "utf8"),
);

assert.ok(design.hero?.image, "hero.image required");
assert.ok(design.featuredSlideshow, "featuredSlideshow required");
assert.equal(design.featuredSlideshow.enabled, true);
assert.ok(Array.isArray(design.featuredSlideshow.slides));
assert.ok(design.featuredSlideshow.slides.length >= 1, "seed at least one slide");

const slide = design.featuredSlideshow.slides[0];
assert.ok(slide.image, "seed slide has image");
assert.ok(slide.caption, "seed slide has caption");
assert.ok(slide.note, "seed slide has note");
assert.ok(Array.isArray(slide.stats));

// Hero and slideshow must be independently addressable (same seed is OK,
// but the featured card must not *require* hero.image at read time).
assert.notEqual(slide.image, undefined);
assert.ok("image" in slide);

const featured = readFileSync(
  join(root, "src/components/home/FeaturedFieldNote.tsx"),
  "utf8",
);
assert.match(featured, /featuredSlideshow/);
assert.doesNotMatch(
  featured,
  /hero\.(image|imageCaption|windowBadge|stats)/,
  "FeaturedFieldNote must not read hero fields",
);

const form = readFileSync(
  join(root, "src/components/cms/DesignForm.tsx"),
  "utf8",
);
assert.match(form, /FeaturedSlideshowEditor/);
assert.match(form, /featuredSlideshow/);

console.log("featured slideshow checks passed");
