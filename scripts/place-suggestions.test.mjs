import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLANNER_CITIES } from "../src/data/planner-cities.mjs";
import { suggestPlaces } from "../src/lib/place-suggestions.ts";

const JOURNAL = [
  "Reykjavík, Iceland",
  "Toronto, Canada",
  "Colorado, United States",
  "Cancún, Mexico",
  "Rio de Janeiro, Brazil",
];

describe("place suggestions", () => {
  it("keeps static city labels unique", () => {
    const labels = PLANNER_CITIES.map(([city, country]) =>
      `${city}, ${country}`.toLowerCase(),
    );
    assert.equal(new Set(labels).size, labels.length);
  });

  it("suggests Lisbon without the full name", () => {
    const labels = suggestPlaces("lis", JOURNAL).map((place) => place.label);
    assert.equal(labels[0], "Lisbon, Portugal");
  });

  it("ranks journal places ahead of other prefix matches", () => {
    const [first, second] = suggestPlaces("to", JOURNAL);
    assert.equal(first.label, "Toronto, Canada");
    assert.equal(first.journal, true);
    assert.equal(second.label, "Tokyo, Japan");
    assert.equal(second.journal, false);
  });

  it("folds accents onto journal places", () => {
    const [cancun] = suggestPlaces("cancun", JOURNAL);
    assert.equal(cancun.label, "Cancún, Mexico");
    assert.equal(cancun.journal, true);
    const [reykjavik] = suggestPlaces("reykjavik", JOURNAL);
    assert.equal(reykjavik.label, "Reykjavík, Iceland");
    assert.equal(reykjavik.journal, true);
  });

  it("matches airport codes and nicknames to the city label", () => {
    assert.equal(suggestPlaces("ewr", JOURNAL)[0]?.label, "Newark, United States");
    assert.equal(suggestPlaces("nyc")[0]?.label, "New York, United States");
    assert.equal(suggestPlaces("rio", JOURNAL)[0]?.label, "Rio de Janeiro, Brazil");
  });

  it("includes journal places that are not in the city list", () => {
    const [colorado] = suggestPlaces("color", JOURNAL);
    assert.equal(colorado.label, "Colorado, United States");
    assert.equal(colorado.journal, true);
  });

  it("does not match letters buried inside another word", () => {
    const labels = suggestPlaces("lis", JOURNAL).map((place) => place.label);
    assert.equal(labels[0], "Lisbon, Portugal");
    assert.equal(labels.includes("Minneapolis, United States"), false);
  });

  it("matches a city from the middle of its name", () => {
    const labels = suggestPlaces("new y").map((place) => place.label);
    assert.equal(labels[0], "New York, United States");
  });

  it("returns nothing for a blank or unknown query", () => {
    assert.deepEqual(suggestPlaces("   ", JOURNAL), []);
    assert.deepEqual(suggestPlaces("zzzz-not-a-place", JOURNAL), []);
  });
});
