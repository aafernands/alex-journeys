import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CONFIG, normalizeConfig } from "../src/lib/trip-planner-model.ts";
import { validateTripPlannerInput } from "../src/lib/cms/validate-trip-planner.ts";
import { findDestinationPhoto, fallbackDestinationPhoto } from "../src/lib/destination-photo.ts";

const custom = { url: "/media/my-trip-banner.webp", alt: "Mountains at sunset" };

test("CMS fallback survives validation and normalization and can be removed", () => {
  const result = validateTripPlannerInput({ config: { ...DEFAULT_CONFIG, fallbackImage: custom }, partners: [] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.config.fallbackImage, custom);
  assert.equal(normalizeConfig(DEFAULT_CONFIG).fallbackImage, undefined);
  assert.equal(validateTripPlannerInput({ config: { ...DEFAULT_CONFIG, fallbackImage: { ...custom, url: "javascript:alert(1)" } }, partners: [] }).ok, false);
});

test("custom fallback retains its actual description without claiming to depict the destination", () => {
  const photo = fallbackDestinationPhoto("Lisbon", custom);
  assert.equal(photo.image, custom.url);
  assert.equal(photo.alt, custom.alt);
  assert.equal(photo.source, "Trip planner image");
});

test("configured upload takes precedence over automatic fallbacks when Unsplash is unavailable", async (t) => {
  const previous = process.env.UNSPLASH_ACCESS_KEY;
  t.after(() => { if (previous === undefined) delete process.env.UNSPLASH_ACCESS_KEY; else process.env.UNSPLASH_ACCESS_KEY = previous; });
  delete process.env.UNSPLASH_ACCESS_KEY;
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 429 }));
  assert.equal((await findDestinationPhoto("Lisbon", custom)).image, custom.url);
  assert.equal(fetchMock.mock.callCount(), 0);
  process.env.UNSPLASH_ACCESS_KEY = "test-key";
  assert.equal((await findDestinationPhoto("Lisbon", custom)).image, custom.url);
  assert.equal(fetchMock.mock.callCount(), 1);
});
