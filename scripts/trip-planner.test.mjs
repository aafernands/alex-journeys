import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PARTNERS,
  bookingSummary,
  dateSummary,
  effectiveCategories,
  fillAffiliateUrl,
  planFingerprint,
  flexibleRange,
  formatDateRange,
  formatFlexible,
  initialPlannerState,
  partnerLaneHref,
  resolveAffiliateHref,
  reviewRows,
  travelerSummary,
  validateCategories,
  validateDetails,
  visiblePartners,
} from "../src/lib/trip-planner-model.ts";

function lisbonTrip() {
  return {
    ...initialPlannerState(),
    categories: ["flights", "hotel"],
    destination: "Lisbon, Portugal",
    startDate: "2027-04-12",
    endDate: "2027-04-19",
    adults: 2,
    children: 0,
    origin: "Newark (EWR)",
    tripType: "roundtrip",
    rooms: 1,
  };
}

describe("plan a trip planner", () => {
  it("treats unsure as all three categories", () => {
    const state = { ...initialPlannerState(), unsure: true };
    assert.deepEqual(effectiveCategories(state), ["flights", "hotel", "car"]);
    assert.equal(validateCategories(state), null);
    assert.equal(validateCategories(initialPlannerState()), "Pick at least one.");
  });

  it("formats the approved exact date range", () => {
    assert.equal(formatDateRange("2027-04-12", "2027-04-19"), "Apr 12–19, 2027");
    assert.equal(formatDateRange("2027-04-12", "2027-05-02"), "Apr 12–May 2, 2027");
    assert.equal(
      formatDateRange("2026-12-28", "2027-01-04"),
      "Dec 28, 2026–Jan 4, 2027",
    );
  });

  it("summarizes flexible dates and derives a search range", () => {
    const state = {
      ...initialPlannerState(),
      categories: ["hotel"],
      dateMode: "flexible",
      month: "2027-05",
      nights: 5,
      destination: "Lisbon",
    };
    assert.equal(formatFlexible("2027-05", 5), "May 2027 · 5 nights");
    assert.equal(formatFlexible("2027-05", 1), "May 2027 · 1 night");
    assert.equal(dateSummary(state, true), "May 2027 · 5 nights");
    assert.deepEqual(flexibleRange("2027-05", 5), {
      startDate: "2027-05-01",
      endDate: "2027-05-06",
    });
    assert.equal(dateSummary(state, false), "");
  });

  it("rejects an end date before the start and a missing flight origin", () => {
    const state = {
      ...lisbonTrip(),
      endDate: "2027-04-01",
      origin: "",
    };
    const errors = validateDetails(state, true);
    assert.equal(errors.endDate, "End date can’t be before the start.");
    assert.equal(errors.origin, "Add where you’re flying from.");
  });

  it("requires a car pickup location when it is not the destination", () => {
    const state = {
      ...initialPlannerState(),
      categories: ["car"],
      destination: "Lisbon",
      startDate: "2027-04-12",
      endDate: "2027-04-19",
      carPickupSameAsDestination: false,
      carPickupLocation: "",
    };
    const errors = validateDetails(state, true);
    assert.equal(errors.carPickupLocation, "Add a pickup location.");
  });

  it("builds the review rows from the Lisbon mock", () => {
    const rows = Object.fromEntries(
      reviewRows(lisbonTrip(), true).map((row) => [row.label, row.value]),
    );
    assert.equal(rows.Booking, "Flights · Hotel");
    assert.equal(rows.Destination, "Lisbon, Portugal");
    assert.equal(rows.Dates, "Apr 12–19, 2027");
    assert.equal(rows.Travelers, "2 adults");
    assert.equal(rows.From, "Newark (EWR) · Round-trip");
    assert.equal(rows.Rooms, "1");
    assert.equal(rows["Car pickup"], undefined);
    assert.equal(bookingSummary({ ...lisbonTrip(), children: 1 }), "Flights · Hotel");
    assert.equal(
      travelerSummary({ ...lisbonTrip(), adults: 1, children: 1 }),
      "1 adult · 1 child",
    );
  });

  it("fills partner slots and falls back to the Tools URL", () => {
    const booking = DEFAULT_PARTNERS.find((partner) => partner.key === "booking");
    assert.ok(booking);
    const filled = fillAffiliateUrl(booking.affiliateUrlTemplate, {
      destination: "Lisbon, Portugal",
      startDate: "2027-04-12",
      endDate: "2027-04-19",
      adults: "2",
      rooms: "1",
    });
    assert.ok(filled);
    assert.match(filled, /ss%3DLisbon%2C%20Portugal/);
    assert.match(filled, /checkin%3D2027-04-12/);
    assert.match(filled, /group_adults%3D2/);
    assert.equal(
      fillAffiliateUrl(booking.affiliateUrlTemplate, {
        destination: "Lisbon",
      }),
      null,
    );
    assert.equal(
      resolveAffiliateHref(booking, { destination: "Lisbon" }),
      booking.affiliateUrl,
    );

    const expedia = DEFAULT_PARTNERS.find((partner) => partner.key === "expedia");
    assert.ok(expedia);
    assert.equal(
      resolveAffiliateHref(expedia, {
        destination: "Lisbon",
        origin: "EWR",
        startDate: "2027-04-12",
        endDate: "2027-04-19",
        adults: "2",
      }),
      "https://expedia.com/affiliates/nyc/plan_trip",
    );
    assert.equal(
      partnerLaneHref(expedia, lisbonTrip(), true),
      "https://expedia.com/affiliates/nyc/plan_trip",
    );

    const rentcars = DEFAULT_PARTNERS.find((partner) => partner.key === "rentcars");
    assert.ok(rentcars);
    const carTrip = {
      ...lisbonTrip(),
      categories: ["car"],
    };
    assert.equal(
      partnerLaneHref(rentcars, carTrip, true),
      rentcars.affiliateUrl,
    );

    const viator = DEFAULT_PARTNERS.find((partner) => partner.key === "viator");
    assert.ok(viator);
    assert.equal(
      partnerLaneHref(viator, lisbonTrip(), true),
      "/experiences?dest=Lisbon%2C+Portugal&start=2027-04-12&end=2027-04-19&adults=2",
    );
    assert.equal(
      partnerLaneHref(
        viator,
        { ...lisbonTrip(), children: 1 },
        true,
      ),
      "/experiences?dest=Lisbon%2C+Portugal&start=2027-04-12&end=2027-04-19&adults=2&children=1",
    );
    assert.equal(
      partnerLaneHref(viator, initialPlannerState(), true),
      "/experiences",
    );
  });

  it("keeps one checklist fingerprint for the same plan", () => {
    const base = lisbonTrip();
    const again = { ...base, categories: ["hotel", "flights"] };
    assert.equal(planFingerprint(base, true), planFingerprint(again, true));

    const allThree = { ...base, categories: ["flights", "hotel", "car"] };
    const unsure = { ...allThree, categories: [], unsure: true };
    assert.equal(planFingerprint(allThree, true), planFingerprint(unsure, true));
    assert.notEqual(planFingerprint(base, true), planFingerprint(unsure, true));

    const otherCity = { ...base, destination: "Porto" };
    assert.notEqual(planFingerprint(base, true), planFingerprint(otherCity, true));

    const withChild = { ...base, children: 1 };
    assert.notEqual(planFingerprint(base, true), planFingerprint(withChild, true));
  });

  it("shows core steps for the selection and extras after them", () => {
    const visible = visiblePartners(DEFAULT_PARTNERS, lisbonTrip(), true);
    assert.deepEqual(
      visible.map((partner) => partner.key),
      ["expedia", "booking", "world-nomads", "saily", "viator"],
    );
    assert.equal(visible[0].isCore, true);
    assert.equal(visible[2].isCore, false);

    const noExtras = visiblePartners(DEFAULT_PARTNERS, lisbonTrip(), false);
    assert.deepEqual(
      noExtras.map((partner) => partner.key),
      ["expedia", "booking"],
    );
  });
});
