import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFlightsSearchParams } from "../src/lib/flights.ts";
import {
  flightBookingBar,
  itineraryFlightHref,
  mergeBookedFlight,
  nextLocalFlightPlan,
} from "../src/lib/flights-itinerary.ts";
import { initialPlannerState } from "../src/lib/trip-planner-model.ts";
import { tripWriteFromPlan } from "../src/lib/trip-record.ts";

const flight = {
  title: "TAP Air Portugal EWR ⇄ LIS",
  confirmation: "ABC123",
  notes: "EWR ⇄ LIS · Apr 12 – Apr 19 · Economy",
  href: "/flights?origin=Newark+%28EWR%29&dest=Lisbon%2C+Portugal&start=2027-04-12&end=2027-04-19&type=roundtrip",
  departDate: "2027-04-12",
  time: "18:30",
};

function lisbonPlan(extra = {}) {
  return {
    step: 4,
    state: {
      ...initialPlannerState(),
      categories: ["flights", "hotel"],
      origin: "Newark (EWR)",
      destination: "Lisbon, Portugal",
      startDate: "2027-04-12",
      endDate: "2027-04-19",
      adults: 2,
      tripType: "roundtrip",
    },
    items: [],
    tripId: "trip_abc",
    packingNotes: "",
    title: "",
    titleCustom: false,
    ...extra,
  };
}

describe("flights itinerary handoff", () => {
  it("shows trip chrome and a way back to the flight lane", () => {
    const query = parseFlightsSearchParams({
      origin: "Newark (EWR)",
      dest: "Lisbon, Portugal",
      start: "2027-04-12",
      end: "2027-04-19",
      type: "roundtrip",
      trip: "trip_abc",
    });
    const bar = flightBookingBar(query);
    assert.ok(bar);
    assert.equal(
      bar.label,
      "Booking for: Newark (EWR) → Lisbon, Portugal · Apr 12–19, 2027",
    );
    assert.equal(bar.backHref, "/guides/plan-a-trip?trip=trip_abc");
    assert.equal(
      itineraryFlightHref("trip_abc"),
      "/guides/plan-a-trip?trip=trip_abc&flight=booked#plan-flight-lane",
    );
  });

  it("adds a booked flight on the departure day and keeps it on a save", () => {
    const merged = mergeBookedFlight(lisbonPlan(), flight);
    assert.equal(merged.added, true);
    assert.equal(merged.plan.items.length, 1);
    const item = merged.plan.items[0];
    assert.equal(item.type, "flight");
    assert.equal(item.status, "booked");
    assert.equal(item.laneKey, "expedia");
    assert.equal(item.confirmation, "ABC123");
    assert.equal(item.dayIndex, 1);
    assert.equal(item.time, "18:30");
    assert.equal(item.url.startsWith("/flights?"), true);
    const again = mergeBookedFlight(merged.plan, flight);
    assert.equal(again.added, false);
    assert.equal(again.plan.items.length, 1);

    const write = tripWriteFromPlan(merged.plan, true);
    assert.equal(write.items.length, 1);
    assert.equal(write.items[0].type, "flight");

    const local = nextLocalFlightPlan(
      lisbonPlan({ tripId: null }),
      {
        origin: "Newark (EWR)",
        destination: "Lisbon, Portugal",
        startDate: "2027-04-12",
        endDate: "2027-04-19",
        adults: 2,
        children: 0,
        tripType: "roundtrip",
        tripId: null,
      },
      flight,
    );
    assert.equal(local.kind, "local");
  });
});
