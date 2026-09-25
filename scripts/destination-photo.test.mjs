import assert from "node:assert/strict";
import { test } from "node:test";
import { findDestinationPhoto } from "../src/lib/destination-photo.ts";

test("destination photos preserve location context, hotlinking and attribution", async (t) => {
  const previous = process.env.UNSPLASH_ACCESS_KEY;
  process.env.UNSPLASH_ACCESS_KEY = "test-key";
  t.after(() => { if (previous === undefined) delete process.env.UNSPLASH_ACCESS_KEY; else process.env.UNSPLASH_ACCESS_KEY = previous; });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(new URL(url).searchParams.get("query"), "Paris, Texas landscape landmark");
    assert.equal(options.headers.Authorization, "Client-ID test-key");
    return Response.json({ results: [{ urls: { regular: "https://images.unsplash.com/photo-example?ixid=credit" }, user: { name: "Photographer", links: { html: "https://unsplash.com/@photographer" } } }] });
  });
  const photo = await findDestinationPhoto("Paris, Texas");
  assert.ok(photo);
  assert.equal(photo.photographer, "Photographer");
  assert.equal(photo.source, "Unsplash");
  assert.equal(photo.license, "Unsplash License");
  assert.equal(new URL(photo.image).searchParams.get("ixid"), "credit");
  assert.match(photo.photographerUrl, /utm_source=alex_journeys/);
});

test("missing credentials, empty results and provider failures use a legal fallback", async (t) => {
  const previous = process.env.UNSPLASH_ACCESS_KEY;
  t.after(() => { if (previous === undefined) delete process.env.UNSPLASH_ACCESS_KEY; else process.env.UNSPLASH_ACCESS_KEY = previous; });
  delete process.env.UNSPLASH_ACCESS_KEY;
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ results: [] }));
  const missingKey = await findDestinationPhoto("Lisbon, Portugal");
  assert.ok(missingKey);
  assert.equal(missingKey.source, "Alex Journeys artwork");
  assert.equal(fetchMock.mock.callCount(), 1);
  process.env.UNSPLASH_ACCESS_KEY = "test-key";
  const emptyResults = await findDestinationPhoto("Lisbon, Portugal");
  assert.ok(emptyResults);
  assert.equal(emptyResults.source, "Alex Journeys artwork");
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 429 }));
  const rateLimited = await findDestinationPhoto("Lisbon, Portugal");
  assert.ok(rateLimited);
  assert.equal(rateLimited.source, "Alex Journeys artwork");
  fetchMock.mock.mockImplementation(async () => { throw new Error("network unavailable"); });
  const failed = await findDestinationPhoto("Lisbon, Portugal");
  assert.ok(failed);
  assert.equal(failed.source, "Alex Journeys artwork");
});
