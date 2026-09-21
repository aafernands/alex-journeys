import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  DESTINATION_ISO_A2_BY_SLUG,
  destinationMatchesCountryFeature,
  featureIsoA2,
  findMatchingDestination,
  isoA2ForDestination,
} from "../src/lib/destination-iso.ts";

const GEO_PATH = path.resolve("src/content/geo/world-countries.json");

const tree = JSON.parse(
  fs.readFileSync("src/content/destinations/tree.json", "utf8"),
);

function allDestinations() {
  return tree.flatMap((c) => c.countries);
}

describe("destination ISO mapping", () => {
  it("maps current journal countries to verified ISO alpha-2 codes", () => {
    assert.equal(isoA2ForDestination({ slug: "iceland", name: "Iceland" }), "IS");
    assert.equal(isoA2ForDestination({ slug: "canada", name: "Canada" }), "CA");
    assert.equal(
      isoA2ForDestination({ slug: "united-states", name: "United States" }),
      "US",
    );
    assert.equal(isoA2ForDestination({ slug: "mexico", name: "Mexico" }), "MX");
    assert.equal(isoA2ForDestination({ slug: "brazil", name: "Brazil" }), "BR");
  });

  it("does not invent a code for an unknown destination", () => {
    assert.equal(
      isoA2ForDestination({ slug: "narnia", name: "Narnia" }),
      undefined,
    );
  });

  it("rejects invalid GeoJSON ISO values", () => {
    assert.equal(featureIsoA2({ iso_a2: "-99" }), undefined);
    assert.equal(featureIsoA2({ iso_a2: "USA" }), undefined);
    assert.equal(featureIsoA2({ iso_a2: "us" }), "US");
  });
});

describe("vendored world countries GeoJSON", () => {
  const geo = JSON.parse(fs.readFileSync(GEO_PATH, "utf8"));

  it("covers every current destination with a matching feature", () => {
    const destinations = allDestinations();
    assert.ok(destinations.length > 0);

    for (const dest of destinations) {
      const match = geo.features.find((f) =>
        destinationMatchesCountryFeature(dest, f.properties),
      );
      assert.ok(
        match,
        `No GeoJSON country for ${dest.slug} (${dest.name}); skip highlight rather than guess an ISO code`,
      );
      const expected = DESTINATION_ISO_A2_BY_SLUG[dest.slug];
      assert.equal(match.properties.iso_a2, expected);
    }
  });

  it("keeps name/iso fields used by the map", () => {
    const usa = geo.features.find((f) => f.properties.iso_a2 === "US");
    assert.equal(usa.properties.name, "United States");
    assert.equal(usa.properties.iso_a3, "USA");
  });

  it("finds a destination from a feature", () => {
    const dests = [
      { slug: "iceland", name: "Iceland", href: "/iceland" },
      { slug: "canada", name: "Canada", href: "/canada" },
    ];
    const found = findMatchingDestination(dests, {
      name: "Iceland",
      iso_a2: "IS",
    });
    assert.equal(found?.slug, "iceland");
    assert.equal(
      findMatchingDestination(dests, { name: "France", iso_a2: "FR" }),
      undefined,
    );
  });

  it("matches unmapped destinations only on an exact GeoJSON name", () => {
    const dest = { slug: "japan", name: "Japan" };
    assert.equal(isoA2ForDestination(dest), undefined);
    assert.equal(
      destinationMatchesCountryFeature(dest, {
        name: "Japan",
        iso_a2: "JP",
      }),
      true,
    );
    assert.equal(
      destinationMatchesCountryFeature(dest, {
        name: "Japanese Empire",
        iso_a2: "JP",
      }),
      false,
    );
  });
});
