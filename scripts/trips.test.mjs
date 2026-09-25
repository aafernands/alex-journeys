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
  accountSaveIntent,
  isReasonableTripDraft,
  isSafeHttpUrl,
  isTripItemUrl,
  normalizeTripItems,
  parseTitleOnlyPatch,
  parseTripWrite,
  planATripLoginHref,
  compareScheduledItems,
  formatTripWeekRange,
  scheduledDayIndex,
  shouldPromptTripSignIn,
  suggestTripTitle,
  tripCapacityMessage,
  tripDays,
  tripWeeks,
  tripWriteFromPlan,
  MAX_SAVED_TRIPS,
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
    assert.equal(isTripItemUrl("/stays/lp1897?dest=Lisbon&trip=trip_abc"), true);
    assert.equal(isTripItemUrl("//evil.example/phish"), false);
    const onSite = parseTripWrite({
      ...tripWriteFromPlan({ state: lisbonState(), items: [] }, true),
      items: [
        {
          id: "item-stay1234",
          type: "hotel",
          title: "Hotel du Test",
          url: "/stays/lp1897?dest=Lisbon&trip=trip_abc",
          notes: "Apr 12–19",
          confirmation: "CONF-12345",
          status: "booked",
          laneKey: "booking",
          sortOrder: 0,
          updatedAt: "2026-09-22T00:00:00.000Z",
        },
      ],
    });
    assert.equal(onSite.ok, true);
    if (onSite.ok) {
      assert.equal(onSite.data.items[0]?.url, "/stays/lp1897?dest=Lisbon&trip=trip_abc");
      assert.equal(onSite.data.items[0]?.status, "booked");
      assert.equal(onSite.data.items[0]?.confirmation, "CONF-12345");
    }
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

  it("keeps pickup and return details for a car booking", () => {
    const item = createTripItem({
      type: "car",
      title: "Avis rental",
      pickupLocation: "Denver airport",
      dropoffLocation: "Downtown Denver",
      pickupDate: "2027-04-12",
      dropoffDate: "2027-04-19",
      pickupTime: "09:30",
      dropoffTime: "16:00",
      sortOrder: 1,
    });
    const parsed = parseTripWrite(
      tripWriteFromPlan({ state: lisbonState(), items: [item] }, true),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(parsed.data.items[0], item);
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

  it("lays trip days onto Sunday-start weeks", () => {
    const exact = tripWeeks(tripDays(lisbonState(), true));
    assert.equal(exact.length, 2);
    assert.equal(exact[0]?.startDate, "2027-04-11");
    assert.equal(formatTripWeekRange(exact[0]?.startDate ?? ""), "Apr 11 – 17");
    assert.equal(exact[0]?.cells[0], null);
    assert.equal(exact[0]?.cells[1]?.label, "Day 1");
    assert.equal(exact[0]?.cells[1]?.detail, "Mon, Apr 12");
    assert.equal(exact[0]?.cells[6]?.label, "Day 6");
    assert.equal(exact[1]?.startDate, "2027-04-18");
    assert.equal(formatTripWeekRange(exact[1]?.startDate ?? ""), "Apr 18 – 24");
    assert.equal(exact[1]?.cells[0]?.label, "Day 7");
    assert.equal(exact[1]?.cells[1]?.date, "2027-04-19");
    assert.equal(exact[1]?.cells[2], null);
    assert.equal(exact[1]?.cells.length, 7);

    const flexible = tripWeeks(
      tripDays(
        {
          ...initialPlannerState(),
          destination: "Lisbon, Portugal",
          dateMode: "flexible",
          month: "2027-05",
          nights: 5,
        },
        true,
      ),
    );
    assert.equal(flexible[0]?.cells[6]?.date, "2027-05-01");
    assert.equal(flexible[1]?.cells[4]?.date, "2027-05-06");
    assert.equal(flexible[1]?.cells[5], null);
    assert.deepEqual(tripWeeks([]), []);

    const early = { dayIndex: 1, time: "14:00", sortOrder: 2, updatedAt: "b" };
    const later = { dayIndex: 1, time: "09:00", sortOrder: 1, updatedAt: "a" };
    const untimed = { dayIndex: 1, sortOrder: 0, updatedAt: "c" };
    assert.deepEqual(
      [early, untimed, later].sort(compareScheduledItems).map((item) => item.time ?? ""),
      ["09:00", "14:00", ""],
    );
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
    assert.equal(
      planATripLoginHref(null, "signup"),
      "/login?callbackUrl=%2Fguides%2Fplan-a-trip&mode=signup",
    );
  });

  it("keeps a renamed title and still suggests one by default", () => {
    const suggested = tripWriteFromPlan({ state: lisbonState(), items: [] }, true);
    assert.equal(suggested.title, "Lisbon · Apr 2027");
    const renamed = tripWriteFromPlan(
      {
        state: lisbonState(),
        items: [],
        title: "Spring in Lisbon",
        titleCustom: true,
      },
      true,
    );
    assert.equal(renamed.title, "Spring in Lisbon");
  });

  it("treats a title-only patch as a rename", () => {
    const renamed = parseTitleOnlyPatch({ title: "  Spring in Lisbon  " });
    assert.equal(renamed?.ok, true);
    if (renamed?.ok) assert.equal(renamed.title, "Spring in Lisbon");
    assert.equal(parseTitleOnlyPatch({ title: "   " })?.ok, false);
    assert.equal(parseTitleOnlyPatch({ title: "Hi", destination: "Lisbon" }), null);
  });

  it("offers a guest draft after login and auto-saves a signed-in trip", () => {
    assert.equal(
      accountSaveIntent({
        authenticated: true,
        tripId: null,
        step: 4,
        hasDestination: true,
        guestOrigin: true,
        dismissed: false,
      }),
      "offer",
    );
    assert.equal(
      accountSaveIntent({
        authenticated: true,
        tripId: null,
        step: 4,
        hasDestination: true,
        guestOrigin: true,
        dismissed: true,
      }),
      "declined",
    );
    assert.equal(
      accountSaveIntent({
        authenticated: true,
        tripId: "abc",
        step: 4,
        hasDestination: true,
        guestOrigin: true,
        dismissed: false,
      }),
      "autosave",
    );
    assert.equal(
      accountSaveIntent({
        authenticated: false,
        tripId: "abc",
        step: 4,
        hasDestination: true,
        guestOrigin: false,
        dismissed: false,
      }),
      "local",
    );
    assert.equal(tripCapacityMessage(MAX_SAVED_TRIPS)?.includes("50"), true);
    assert.equal(tripCapacityMessage(3), null);
  });

  it("keeps a signed-out editor on the trip already open in this browser", () => {
    assert.equal(
      shouldPromptTripSignIn({
        urlTripId: "abc",
        signedIn: false,
        authLoading: false,
        planTripId: "abc",
      }),
      false,
    );
    assert.equal(
      shouldPromptTripSignIn({
        urlTripId: "abc",
        signedIn: false,
        authLoading: false,
        planTripId: null,
      }),
      true,
    );
    assert.equal(
      shouldPromptTripSignIn({
        urlTripId: "abc",
        signedIn: true,
        authLoading: false,
        planTripId: null,
      }),
      false,
    );
  });
});
