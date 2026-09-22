import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFlightsSearchParams } from "../src/lib/flights.ts";
import {
  flightBookingBar,
  itineraryFlightHref,
  mergeBookedFlight,
  nextLocalFlightPlan,
  parseStoredFlightConfirmations,
  resolveFlightConfirmation,
} from "../src/lib/flights-itinerary.ts";
import { initialPlannerState } from "../src/lib/trip-planner-model.ts";
import { tripWriteFromPlan } from "../src/lib/trip-record.ts";

const flight = {
  title: "TAP Air Portugal EWR ⇄ LIS",
  confirmation: "ABC123",
  notes: "EWR ⇄ LIS · Apr 12 – Apr 19 · Economy",
  href: "/flights/confirmation?booking=book_123&ref=ABC123&route=EWR+%E2%86%92+LIS&dates=Apr+12+%E2%80%93+Apr+19&total=%24640&origin=Newark+%28EWR%29&dest=Lisbon%2C+Portugal&start=2027-04-12&end=2027-04-19&type=roundtrip",
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
    assert.equal(item.url.startsWith("/flights/confirmation?"), true);
    assert.equal(item.url.includes("booking=book_123"), true);
    assert.equal(item.url.startsWith("/flights?"), false);
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

    const guest = nextLocalFlightPlan(
      null,
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
    assert.equal(guest.kind, "local");
    if (guest.kind === "local") {
      assert.equal(guest.plan.tripId, null);
      assert.equal(guest.plan.items[0]?.url.startsWith("/flights/confirmation?"), true);
    }

    const account = nextLocalFlightPlan(
      lisbonPlan({ tripId: "trip_other" }),
      {
        origin: "Newark (EWR)",
        destination: "Lisbon, Portugal",
        startDate: "2027-04-12",
        endDate: "2027-04-19",
        adults: 2,
        children: 0,
        tripType: "roundtrip",
        tripId: "trip_abc",
      },
      flight,
    );
    assert.equal(account.kind, "account");
  });

  it("replaces a search link with the confirmation for that booking", () => {
    const search = {
      ...flight,
      href: "/flights?origin=Newark+%28EWR%29&dest=Lisbon%2C+Portugal&start=2027-04-12&end=2027-04-19&type=roundtrip",
    };
    const merged = mergeBookedFlight(lisbonPlan(), search);
    assert.equal(merged.plan.items[0].url.startsWith("/flights?"), true);
    const fixed = mergeBookedFlight(merged.plan, flight);
    assert.equal(fixed.added, false);
    assert.equal(fixed.plan.items.length, 1);
    assert.equal(fixed.plan.items[0].url, flight.href);
    assert.equal(fixed.plan.items[0].url.startsWith("/flights/confirmation?"), true);
  });

  it("keeps a stored confirmation ahead of a thinner URL copy", () => {
    const stored = parseStoredFlightConfirmations(
      JSON.stringify([
        {
          confirmation: {
            title: "TAP Air Portugal EWR ⇄ LIS",
            bookingId: "book_123",
            confirmationCode: "ABC123",
            status: "CONFIRMED",
            routeLabel: "EWR ⇄ LIS",
            dateLabel: "Apr 12 – Apr 19",
            cabin: "Economy",
            baggage: "Carry-on",
            conditions: ["Non-refundable"],
            totalLabel: "$640",
            passengerName: "Ada Lovelace",
            email: "ada@example.com",
            payment: { method: "guest_card", label: "Paid with the card confirmed through Nuitee." },
            sandbox: true,
            departDate: "2027-04-12",
            departTime: "18:30",
          },
        },
      ]),
    );
    assert.equal(stored.length, 1);
    assert.equal(stored[0].passengerName, "Ada Lovelace");
    assert.equal(stored[0].email, "ada@example.com");
    const fromUrl = {
      ...stored[0],
      passengerName: "",
      email: "",
      conditions: [],
    };
    const resolved = resolveFlightConfirmation(fromUrl, stored[0]);
    assert.equal(resolved.passengerName, "Ada Lovelace");
    assert.equal(resolveFlightConfirmation(fromUrl, null), fromUrl);
    assert.equal(parseStoredFlightConfirmations("{").length, 0);
    assert.equal(
      parseStoredFlightConfirmations(JSON.stringify([{ confirmation: { bookingId: "bad id" } }])).length,
      0,
    );
  });
});
