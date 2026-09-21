import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { journalNotesForDestination } from "../src/lib/trip-journal.ts";
import { initialPlannerState } from "../src/lib/trip-planner-model.ts";
import {
  bookedChecklist,
  createTripItem,
  decodeSharedPlan,
  encodeSharedPlan,
  extractBookingPaste,
  mentionedTripDay,
  isReasonableTripDraft,
  isSafeHttpUrl,
  normalizeTripItems,
  parseTripWrite,
  planATripLoginHref,
  scheduledDayIndex,
  suggestTripTitle,
  tripDays,
  tripWriteFromPlan,
} from "../src/lib/trip-record.ts";

function lisbonState() {
  return {
    ...initialPlannerState(),
    categories: ["flights", "hotel"],
    destination: "Lisbon, Portugal",
    startDate: "2027-04-12",
    endDate: "2027-04-19",
    adults: 2,
    origin: "Newark (EWR)",
    rooms: 1,
  };
}

describe("saved trips", () => {
  it("titles a Lisbon April trip the way the hub expects", () => {
    assert.equal(suggestTripTitle(lisbonState(), true), "Lisbon · Apr 2027");
  });

  it("rejects a missing destination and a javascript link", () => {
    const missing = parseTripWrite({ destination: "  " });
    assert.equal(missing.ok, false);

    const bad = parseTripWrite({
      ...tripWriteFromPlan({ state: lisbonState(), items: [] }, true),
      items: [
        {
          id: "item-12345678",
          type: "flight",
          title: "Outbound",
          url: "javascript:alert(1)",
          notes: "",
          status: "todo",
          sortOrder: 0,
          updatedAt: "2026-09-21T00:00:00.000Z",
        },
      ],
    });
    assert.equal(bad.ok, true);
    if (bad.ok) assert.equal(bad.data.items.length, 0);
    assert.equal(isSafeHttpUrl("https://www.booking.com/hotel"), true);
    assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
  });

  it("keeps a pasted https link and derives a booked checklist", () => {
    const item = createTripItem({
      type: "hotel",
      title: "Alfama stay",
      url: "https://www.booking.com/hotel/pt/example",
      notes: "Breakfast included",
      laneKey: "booking",
      sortOrder: 1,
    });
    const booked = { ...item, status: "booked" };
    const parsed = parseTripWrite(
      tripWriteFromPlan({ state: lisbonState(), items: [booked] }, true),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.items[0]?.url, item.url);
    assert.equal(parsed.data.items[0]?.laneKey, "booking");
    assert.deepEqual(bookedChecklist(parsed.data.items), [item.id]);
    assert.equal(parsed.data.title, "Lisbon · Apr 2027");
    assert.equal(parsed.data.packingNotes, "");
  });

  it("keeps packing notes on the trip", () => {
    const parsed = parseTripWrite({
      ...tripWriteFromPlan(
        {
          state: lisbonState(),
          items: [],
          packingNotes: "  Adapter\nWalking shoes  ",
        },
        true,
      ),
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.packingNotes, "Adapter\nWalking shoes");
  });

  it("treats a destination on step 4 as a draft worth saving", () => {
    assert.deepEqual(normalizeTripItems(undefined), []);
    const draft = { step: 4, state: lisbonState(), items: [] };
    assert.equal(isReasonableTripDraft(draft), true);
    assert.equal(
      isReasonableTripDraft({
        step: 2,
        state: initialPlannerState(),
        items: [],
      }),
      false,
    );
  });

  it("builds inclusive days from exact dates and flexible nights", () => {
    const exact = tripDays(lisbonState(), true);
    assert.equal(exact.length, 8);
    assert.equal(exact[0]?.label, "Day 1");
    assert.equal(exact[0]?.date, "2027-04-12");
    assert.equal(exact[0]?.detail, "Mon, Apr 12");
    assert.equal(exact[7]?.date, "2027-04-19");
    assert.equal(exact[7]?.label, "Day 8");

    const flexible = tripDays(
      {
        ...initialPlannerState(),
        destination: "Lisbon, Portugal",
        dateMode: "flexible",
        month: "2027-05",
        nights: 5,
      },
      true,
    );
    assert.equal(flexible.length, 6);
    assert.equal(flexible[0]?.date, "2027-05-01");
    assert.equal(flexible[5]?.date, "2027-05-06");
  });

  it("keeps day, time, and confirmation, and reads a pasted blurb", () => {
    const item = createTripItem({
      type: "flight",
      title: "Outbound",
      url: "https://www.expedia.com/flights",
      confirmation: "XK-4M92",
      dayIndex: 2,
      time: "09:40",
      sortOrder: 0,
    });
    const parsed = parseTripWrite(
      tripWriteFromPlan({ state: lisbonState(), items: [item] }, true),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.items[0]?.dayIndex, 2);
    assert.equal(parsed.data.items[0]?.time, "09:40");
    assert.equal(parsed.data.items[0]?.confirmation, "XK-4M92");
    assert.equal(scheduledDayIndex(parsed.data.items[0], 8), 2);
    assert.equal(scheduledDayIndex({ ...parsed.data.items[0], dayIndex: 12 }, 8), null);

    const pasted = extractBookingPaste(
      "You're confirmed. Confirmation code is XK4M92. Departs Apr 12 at 9:40 AM. https://www.expedia.com/trips/1.",
    );
    assert.equal(pasted.url, "https://www.expedia.com/trips/1");
    assert.equal(pasted.confirmation, "XK4M92");
    assert.equal(pasted.time, "09:40");
    const days = tripDays(lisbonState(), true);
    assert.equal(mentionedTripDay(days, "Departs Apr 12 at 9:40 AM"), 1);
    assert.equal(
      mentionedTripDay(days, "Hotel check-in April 19, 2027"),
      8,
    );
    assert.equal(mentionedTripDay(days, "See you in Lisbon"), null);
    assert.deepEqual(extractBookingPaste("See you in Lisbon"), {
      url: "",
      confirmation: "",
      time: "",
    });
  });

  it("round-trips a guest itinerary through a share link", () => {
    const item = createTripItem({
      type: "flight",
      title: "Outbound",
      url: "https://www.expedia.com/flights",
      dayIndex: 1,
      time: "09:40",
      sortOrder: 0,
    });
    const token = encodeSharedPlan({
      state: lisbonState(),
      items: [item],
      packingNotes: "Adapter",
    });
    const restored = decodeSharedPlan(token);
    assert.ok(restored);
    assert.equal(restored?.state.destination, "Lisbon, Portugal");
    assert.equal(restored?.items[0]?.title, "Outbound");
    assert.equal(restored?.items[0]?.time, "09:40");
    assert.equal(restored?.packingNotes, "Adapter");
    assert.equal(restored?.tripId, null);
    assert.equal(decodeSharedPlan("not-a-plan"), null);
  });

  it("matches journal notes for a real destination and stays quiet otherwise", () => {
    const places = [
      { slug: "iceland", name: "Iceland", city: "Reykjavík" },
      { slug: "canada", name: "Canada", city: "Toronto" },
    ];
    const notes = [
      {
        slug: "discovering-iceland",
        title: "Discovering Iceland",
        excerpt: "A week on the ring road.",
        date: "2025-07-01",
        destinations: ["iceland"],
      },
      {
        slug: "toronto-weekend",
        title: "A weekend in Toronto",
        excerpt: "Neighborhood walks.",
        date: "2025-08-01",
        destinations: ["canada"],
      },
    ];
    const iceland = journalNotesForDestination(notes, places, "Reykjavík, Iceland");
    assert.deepEqual(iceland.map((note) => note.slug), ["discovering-iceland"]);
    assert.deepEqual(journalNotesForDestination(notes, places, "Lisbon, Portugal"), []);
  });

  it("sends sign-in back to the itinerary", () => {
    assert.equal(
      planATripLoginHref("abc123"),
      "/login?callbackUrl=%2Fguides%2Fplan-a-trip%3Ftrip%3Dabc123",
    );
    assert.equal(
      planATripLoginHref(null),
      "/login?callbackUrl=%2Fguides%2Fplan-a-trip",
    );
  });
});
