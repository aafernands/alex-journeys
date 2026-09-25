import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialPlannerState } from "../src/lib/trip-planner-model.ts";
import { parseTripWrite, tripWriteFromPlan } from "../src/lib/trip-record.ts";
import {
  parseStaysSearchParams,
  stayConfirmationFromParams,
  stayConfirmationPath,
} from "../src/lib/stays.ts";
import {
  itineraryStayHref,
  mergeBookedStay,
  mergePendingStays,
  nextLocalPlan,
  queuePendingStay,
  stayBookingBar,
  takePendingForTrip,
} from "../src/lib/stays-itinerary.ts";

const stay = {
  hotelName: "Hotel du Test",
  confirmation: "CONF-12345",
  notes: "Apr 12, 2027 – Apr 19, 2027 · King",
  href: "/stays/lp1897?dest=Lisbon%2C+Portugal&start=2027-04-12&end=2027-04-19&trip=trip_abc",
  checkin: "2027-04-12",
  checkout: "2027-04-19",
};

function lisbonPlan(extra = {}) {
  return {
    step: 4,
    state: {
      ...initialPlannerState(),
      categories: ["flights", "hotel"],
      destination: "Lisbon, Portugal",
      startDate: "2027-04-12",
      endDate: "2027-04-19",
      adults: 2,
      rooms: 1,
    },
    items: [],
    tripId: null,
    packingNotes: "",
    title: "",
    titleCustom: false,
    ...extra,
  };
}

describe("stays itinerary handoff", () => {
  it("shows trip chrome and a way back to the hub", () => {
    const query = parseStaysSearchParams({
      dest: "Lisbon, Portugal",
      start: "2027-04-12",
      end: "2027-04-19",
      adults: "2",
      trip: "trip_abc",
    });
    const bar = stayBookingBar(query);
    assert.ok(bar);
    assert.equal(bar.label, "Booking for: Lisbon, Portugal · Apr 12–19, 2027");
    assert.equal(bar.backLabel, "Back to itinerary");
    assert.equal(bar.backHref, "/guides/plan-a-trip?trip=trip_abc");
    assert.equal(
      itineraryStayHref("trip_abc"),
      "/guides/plan-a-trip?trip=trip_abc&stay=booked#plan-stay-lane",
    );
    assert.equal(
      itineraryStayHref(null),
      "/guides/plan-a-trip?stay=booked#plan-stay-lane",
    );
    assert.equal(stayBookingBar(parseStaysSearchParams({})), null);
  });

  it("adds a booked hotel onto the open plan and keeps it on a save", () => {
    const flight = {
      id: "flight-123456",
      type: "flight",
      title: "Outbound",
      url: "https://example.com/flight",
      notes: "",
      status: "todo",
      sortOrder: 0,
      updatedAt: "2026-09-21T00:00:00.000Z",
    };

    const plan = lisbonPlan({ tripId: "trip_abc", items: [flight] });
    const first = mergeBookedStay(plan, stay);
    assert.equal(first.added, true);
    assert.equal(first.plan.step, 4);
    assert.equal(first.plan.items.length, 2);
    const hotel = first.plan.items[1];
    assert.equal(hotel.type, "hotel");
    assert.equal(hotel.status, "booked");
    assert.equal(hotel.laneKey, "booking");
    assert.equal(hotel.confirmation, "CONF-12345");
    assert.equal(hotel.title, "Hotel du Test");
    assert.equal(hotel.dayIndex, 1);
    assert.equal(hotel.url, stay.href);
    assert.equal(first.plan.items[0].title, "Outbound");

    const confirmationHref = stayConfirmationPath(
      {
        bookingId: "book_123",
        confirmationCode: "CONF-12345",
        hotelName: "Hotel du Test",
        status: "CONFIRMED",
        checkin: "2027-04-12",
        checkout: "2027-04-19",
        dateLabel: "Apr 12, 2027 – Apr 19, 2027",
        roomName: "King",
        rateLabel: "Breakfast",
        totalLabel: "$240",
        sandbox: true,
      },
      parseStaysSearchParams({
        dest: "Lisbon, Portugal",
        start: "2027-04-12",
        end: "2027-04-19",
        trip: "trip_abc",
      }),
    );
    assert.equal(confirmationHref.startsWith("/stays/confirmation?"), true);
    const parsedConfirmation = stayConfirmationFromParams(
      Object.fromEntries(
        new URL(`https://example.test${confirmationHref}`).searchParams,
      ),
    );
    assert.equal(parsedConfirmation?.hotelName, "Hotel du Test");
    assert.equal(parsedConfirmation?.confirmationCode, "CONF-12345");

    const upgraded = mergeBookedStay(first.plan, {
      ...stay,
      href: confirmationHref,
    });
    assert.equal(upgraded.added, false);
    assert.equal(upgraded.plan.items[1]?.url, confirmationHref);

    const again = mergeBookedStay(first.plan, stay);
    assert.equal(again.added, false);
    assert.equal(again.plan.items.length, 2);

    const saved = parseTripWrite(tripWriteFromPlan(first.plan, true));
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal(saved.data.items.length, 2);
    assert.equal(saved.data.items.find((item) => item.type === "hotel")?.status, "booked");
    assert.equal(
      saved.data.items.find((item) => item.type === "hotel")?.url,
      stay.href,
    );
  });

  it("seeds a guest plan from a cold stays URL and refuses a different trip", () => {
    const context = {
      destination: "Lisbon, Portugal",
      startDate: "2027-04-12",
      endDate: "2027-04-19",
      adults: 2,
      children: 0,
      rooms: 1,
      tripId: null,
    };
    const seeded = nextLocalPlan(null, context, stay);
    assert.equal(seeded.kind, "local");
    if (seeded.kind !== "local") return;
    assert.equal(seeded.plan.tripId, null);
    assert.equal(seeded.plan.step, 4);
    assert.equal(seeded.plan.state.categories.includes("hotel"), true);
    assert.equal(seeded.plan.items[0]?.status, "booked");
    assert.equal(seeded.plan.items[0]?.confirmation, "CONF-12345");

    const other = nextLocalPlan(
      lisbonPlan({
        state: { ...lisbonPlan().state, destination: "Porto, Portugal" },
      }),
      context,
      stay,
    );
    assert.equal(other.kind, "none");

    const account = nextLocalPlan(null, { ...context, tripId: "trip_abc" }, stay);
    assert.equal(account.kind, "account");

    const open = nextLocalPlan(lisbonPlan({ tripId: "trip_abc" }), { ...context, tripId: "trip_abc" }, stay);
    assert.equal(open.kind, "local");
    if (open.kind !== "local") return;
    assert.equal(open.plan.tripId, "trip_abc");
    assert.equal(open.plan.items.some((item) => item.confirmation === "CONF-12345"), true);
  });

  it("turns a flights-only plan into a hotel lane when the stay matches", () => {
    const plan = lisbonPlan({
      state: { ...lisbonPlan().state, categories: ["flights"] },
    });
    const next = mergeBookedStay(plan, stay);
    assert.deepEqual(next.plan.state.categories, ["flights", "hotel"]);
  });

  it("queues one pending stay per confirmation and merges it onto the account trip", () => {
    const entry = { tripId: "trip_abc", stay };
    const queued = queuePendingStay(queuePendingStay([], entry), entry);
    assert.equal(queued.length, 1);
    const { matches, rest } = takePendingForTrip(queued, "trip_abc");
    assert.equal(matches.length, 1);
    assert.deepEqual(rest, []);
    const plan = mergePendingStays(lisbonPlan({ tripId: "trip_abc" }), matches);
    assert.equal(plan.items[0]?.status, "booked");
    assert.equal(plan.items[0]?.laneKey, "booking");
    assert.equal(takePendingForTrip(queued, "other").matches.length, 0);
  });
});
