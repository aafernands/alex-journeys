import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogFromPayloads } from "../src/lib/stay-catalog-match.ts";
import {
  applyStayFilters,
  classifyStayPropertyType,
  clearStayFilters,
  parseStayFilters,
  pricePillLabel,
  scoreStayAmenity,
  starRatingQueryValues,
  stayFilterCount,
  stayFilterSearchParams,
  stayGuestScore10,
  stayPriceBounds,
} from "../src/lib/stay-filters.ts";
import { parseStaysSearchParams, staysPath, staysQueryString } from "../src/lib/stays.ts";

const card = (overrides) => ({
  name: "Hotel",
  rating: 8.4,
  stars: 4,
  fromPrice: { amount: 200, currency: "USD" },
  ...overrides,
});

describe("stay filter query", () => {
  it("keeps an unfiltered search URL unchanged", () => {
    const path = staysPath({
      destination: "Paris",
      startDate: "2027-06-02",
      endDate: "2027-06-09",
      adults: 2,
    });
    assert.equal(path, "/stays?dest=Paris&start=2027-06-02&end=2027-06-09&adults=2");
    const parsed = parseStaysSearchParams({
      dest: "Paris",
      start: "2027-06-02",
      end: "2027-06-09",
      adults: "2",
    });
    assert.equal(parsed.filters.sort, "popular");
    assert.equal(parsed.filters.guestRating, 0);
    assert.equal(stayFilterCount(parsed.filters), 0);
  });

  it("round-trips active filters and drops junk", () => {
    const parsed = parseStaysSearchParams({
      dest: "Miami",
      start: "2027-03-02",
      end: "2027-03-06",
      adults: "2",
      sort: "price_desc",
      minPrice: "900",
      maxPrice: "120",
      guest: "8",
      stars: "5,4,9,4",
      amenity: "pool,wifi,bogus,spa",
      cancel: "1",
      kind: "home",
    });
    assert.equal(parsed.filters.sort, "price_desc");
    assert.equal(parsed.filters.minPrice, 120);
    assert.equal(parsed.filters.maxPrice, 900);
    assert.equal(parsed.filters.guestRating, 8);
    assert.deepEqual(parsed.filters.stars, [4, 5]);
    assert.deepEqual(parsed.filters.amenities, ["wifi", "pool", "spa"]);
    assert.equal(parsed.filters.freeCancellation, true);
    assert.equal(parsed.filters.kind, "home");
    assert.equal(stayFilterCount(parsed.filters), 1 + 1 + 2 + 3 + 1 + 1);

    const again = parseStaysSearchParams(Object.fromEntries(new URLSearchParams(staysQueryString(parsed))));
    assert.deepEqual(again.filters, parsed.filters);
    assert.deepEqual(stayFilterSearchParams(clearStayFilters(parsed.filters)), [
      ["sort", "price_desc"],
    ]);
    assert.equal(pricePillLabel(parsed.filters), "$120–$900");
  });
});

describe("stay filter application", () => {
  const stays = [
    card({ name: "Cheap", rating: 7.2, stars: 3, fromPrice: { amount: 140, currency: "USD" } }),
    card({ name: "Loved", rating: 9.4, stars: 5, fromPrice: { amount: 480, currency: "USD" } }),
    card({ name: "Quiet", rating: 8.1, stars: 4.5, fromPrice: { amount: 260, currency: "USD" } }),
    card({ name: "Unrated", rating: null, stars: null, fromPrice: null }),
  ];

  it("filters price, guest score, and rounded stars, then sorts", () => {
    assert.deepEqual(stayPriceBounds(stays), { min: 140, max: 480 });
    const priced = applyStayFilters(stays, {
      ...parseStayFilters({}),
      minPrice: 200,
      maxPrice: 300,
    });
    assert.deepEqual(
      priced.map((stay) => stay.name),
      ["Quiet"],
    );

    const guests = applyStayFilters(stays, {
      ...parseStayFilters({}),
      guestRating: 9,
      sort: "rating",
    });
    assert.deepEqual(
      guests.map((stay) => stay.name),
      ["Loved"],
    );

    const stars = applyStayFilters(stays, {
      ...parseStayFilters({}),
      stars: [5],
      sort: "stars",
    });
    assert.deepEqual(
      stars.map((stay) => stay.name),
      ["Loved", "Quiet"],
    );

    const expensive = applyStayFilters(stays, {
      ...parseStayFilters({}),
      sort: "price_desc",
    });
    assert.deepEqual(
      expensive.map((stay) => stay.name),
      ["Loved", "Quiet", "Cheap", "Unrated"],
    );
  });

  it("stretches a 5-point guest score onto the 10-point filter", () => {
    assert.equal(stayGuestScore10(4.5), 9);
    assert.equal(stayGuestScore10(8.6), 8.6);
    const matched = applyStayFilters([card({ name: "Five", rating: 4.5 })], {
      ...parseStayFilters({}),
      guestRating: 9,
    });
    assert.equal(matched.length, 1);
    assert.deepEqual(starRatingQueryValues([4, 5]), [3.5, 4, 4.5, 5]);
  });
});

describe("stay catalog matching", () => {
  it("maps amenity names to one facility each and splits homes from hotels", () => {
    assert.equal(scoreStayAmenity("wifi", "Free WiFi"), 5);
    assert.equal(scoreStayAmenity("wifi", "Paid WiFi"), 0);
    assert.equal(scoreStayAmenity("pool", "Pool table"), 0);
    assert.equal(scoreStayAmenity("beach", "Beach towels"), 0);
    assert.equal(scoreStayAmenity("beach", "Beachfront"), 5);
    assert.equal(classifyStayPropertyType("Aparthotels"), "home");
    assert.equal(classifyStayPropertyType("Hotels"), "hotel");
    assert.equal(classifyStayPropertyType("Boutique hotels"), "hotel");
    assert.equal(classifyStayPropertyType("Campsites"), null);

    const catalog = catalogFromPayloads(
      {
        data: [
          { facility_id: 10, facility: "Paid parking" },
          { facility_id: 11, facility: "Free parking" },
          { facility_id: 12, facility: "Parking" },
          { facility_id: 20, facility: "Free WiFi" },
          { facility_id: 21, facility: "WiFi" },
          { facility_id: 30, facility: "Swimming pool" },
          { facility_id: 31, facility: "Pool table" },
          { facility_id: 40, facility: "Breakfast available (surcharge)" },
          { facility_id: 41, facility: "Free breakfast" },
          { facility_id: 50, facility: "Fitness center" },
          { facility_id: 60, facility: "Spa" },
          { facility_id: 70, facility: "Pets allowed" },
          { facility_id: 80, facility: "Air conditioning" },
          { facility_id: 90, facility: "Beachfront" },
          { facility_id: 91, facility: "Beach towels" },
        ],
      },
      {
        data: [
          { id: 204, name: "Hotels" },
          { id: 206, name: "Resorts" },
          { id: 201, name: "Apartments" },
          { id: 212, name: "Villas" },
          { id: 213, name: "Campsites" },
        ],
      },
    );

    assert.deepEqual(
      catalog.amenities.map((amenity) => [amenity.key, amenity.facilityId, amenity.label]),
      [
        ["wifi", 20, "Free Wi-Fi"],
        ["pool", 30, "Pool"],
        ["parking", 11, "Free parking"],
        ["breakfast", 41, "Free breakfast"],
        ["gym", 50, "Gym"],
        ["spa", 60, "Spa"],
        ["pets", 70, "Pet-friendly"],
        ["ac", 80, "Air conditioning"],
        ["beach", 90, "Beach"],
      ],
    );
    assert.deepEqual(catalog.hotelTypeIds, [204, 206]);
    assert.deepEqual(catalog.homeTypeIds, [201, 212]);
    assert.equal(catalog.propertyTypes, true);
  });

  it("hides property type when homes or hotels are missing", () => {
    const catalog = catalogFromPayloads(
      { data: [] },
      { data: [{ id: 204, name: "Hotels" }] },
    );
    assert.equal(catalog.propertyTypes, false);
    assert.deepEqual(catalog.amenities, []);
  });
});
