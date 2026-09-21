import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_FROM_THE_ROAD_ITEMS,
  MAX_FROM_THE_ROAD_ITEMS,
  normalizeFromTheRoad,
} from "../src/lib/from-the-road.ts";

const FALLBACK = {
  label: "From the road",
  items: DEFAULT_FROM_THE_ROAD_ITEMS.map((item) => ({ ...item })),
};

describe("from the road hero strip", () => {
  it("maps legacy string items to live nav hrefs", () => {
    const strip = normalizeFromTheRoad(
      {
        label: "From the road",
        items: ["Places visited", "Trip notes & photos", "Tools I still use"],
      },
      FALLBACK,
    );

    assert.deepEqual(strip.items, [
      { label: "Places visited", href: "/destinations" },
      { label: "Trip notes & photos", href: "/blog" },
      { label: "Tools I still use", href: "/tools" },
    ]);
  });

  it("keeps { label, href } objects", () => {
    const strip = normalizeFromTheRoad(
      {
        label: "From the road",
        items: [{ label: "Places visited", href: "/destinations" }],
      },
      FALLBACK,
    );
    assert.deepEqual(strip.items, [
      { label: "Places visited", href: "/destinations" },
    ]);
  });

  it("applies a parallel hrefs array to string items", () => {
    const strip = normalizeFromTheRoad(
      {
        label: "From the road",
        items: ["Custom places", "Custom notes"],
        hrefs: ["/destinations", "/blog"],
      },
      FALLBACK,
    );
    assert.deepEqual(strip.items, [
      { label: "Custom places", href: "/destinations" },
      { label: "Custom notes", href: "/blog" },
    ]);
  });

  it("uses fallback items when fromTheRoad is missing", () => {
    const strip = normalizeFromTheRoad(undefined, FALLBACK);
    assert.deepEqual(strip.items, DEFAULT_FROM_THE_ROAD_ITEMS);
    assert.equal(strip.label, "From the road");
  });

  it("caps the strip at six items", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      label: `Item ${i + 1}`,
      href: `/${i + 1}`,
    }));
    const strip = normalizeFromTheRoad({ items }, FALLBACK);
    assert.equal(strip.items.length, MAX_FROM_THE_ROAD_ITEMS);
    assert.equal(strip.items[0].label, "Item 1");
    assert.equal(strip.items[5].href, "/6");
  });
});
