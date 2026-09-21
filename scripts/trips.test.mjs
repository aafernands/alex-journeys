import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialPlannerState } from "../src/lib/trip-planner-model.ts";
import {
  bookedChecklist,
  createTripItem,
  isReasonableTripDraft,
  isSafeHttpUrl,
  normalizeTripItems,
  parseTripWrite,
  planATripLoginHref,
  suggestTripTitle,
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
