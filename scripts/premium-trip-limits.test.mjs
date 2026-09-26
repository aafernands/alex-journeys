import assert from "node:assert/strict";
import test, { describe, it, mock } from "node:test";
import { createFakeFirestore } from "./fixtures/fake-firestore.mjs";

const db = createFakeFirestore();
let session = null;
let storedMembership = null;

class FakeNextResponse extends Response {
  static json(body, init = {}) {
    return new FakeNextResponse(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers || {}) },
    });
  }
}
mock.module("next/server.js", { namedExports: { NextResponse: FakeNextResponse } });
mock.module("@/auth", { namedExports: { auth: async () => session } });
mock.module("@/lib/firebase-admin", {
  namedExports: { isFirebaseConfigured: () => true, getFirestoreDb: () => db },
});
mock.module("@/lib/membership-store", {
  namedExports: {
    getMembership: async () => storedMembership,
    getReaderMembership: async () => storedMembership,
  },
});

const record = await import("../src/lib/trip-record.ts");
const { initialPlannerState } = await import("../src/lib/trip-planner-model.ts");
const { createTrip, TripLimitError } = await import("../src/lib/trips.ts");
const tripsRoute = await import("../src/app/api/trips/route.ts");

const ACTIVE = { status: "active", plan: "yearly" };
const CANCELED = { status: "canceled", plan: "yearly" };

function lisbonWrite() {
  return record.tripWriteFromPlan(
    {
      state: {
        ...initialPlannerState(),
        categories: ["flights", "hotel"],
        destination: "Lisbon, Portugal",
        startDate: "2027-04-12",
        endDate: "2027-04-19",
        adults: 2,
        origin: "Newark (EWR)",
        rooms: 1,
      },
      items: [],
    },
    true,
  );
}

async function seedTrips(userId, count) {
  const col = db.collection("users").doc(userId).collection("trips");
  for (let i = 0; i < count; i += 1) {
    await col.doc(`seed${i}`).set({ title: `Trip ${i}`, updatedAt: new Date(2026, 0, i + 1).toISOString() });
  }
}

describe("saved-trip limits (pure)", () => {
  it("gives free readers 5 and members 200", () => {
    assert.equal(record.FREE_SAVED_TRIPS, 5);
    assert.equal(record.MEMBER_SAVED_TRIPS, 200);
    assert.equal(record.savedTripLimit(false), 5);
    assert.equal(record.savedTripLimit(true), 200);
  });

  it("allows the 5th free save and stops the 6th", () => {
    assert.equal(record.canSaveAnotherTrip(4, false), true);
    assert.equal(record.canSaveAnotherTrip(5, false), false);
    assert.equal(record.tripCapacityMessage(4), null);
    assert.equal(
      record.tripCapacityMessage(5),
      "You\u2019ve saved 5 trips. Premium members get unlimited trips.",
    );
  });

  it("keeps members going past 5 and stops them at 200", () => {
    assert.equal(record.canSaveAnotherTrip(5, true), true);
    assert.equal(record.canSaveAnotherTrip(199, true), true);
    assert.equal(record.canSaveAnotherTrip(200, true), false);
    assert.equal(record.tripCapacityMessage(150, true), null);
    assert.match(record.tripCapacityMessage(200, true), /200 trips/);
  });

  it("treats trips already over the limit as kept, just full", () => {
    // A lapsed member with 12 trips: nothing to delete, no new saves.
    assert.equal(record.canSaveAnotherTrip(12, false), false);
    assert.equal(record.tripCapacityMessage(12), record.FREE_TRIP_LIMIT_MESSAGE);
  });

  it("fails closed on a bad count", () => {
    assert.equal(record.canSaveAnotherTrip(Number.NaN, true), false);
    assert.equal(record.canSaveAnotherTrip(-1, false), false);
  });
});

describe("createTrip enforces the limit on the server", () => {
  it("saves a free reader's 5th trip and refuses the 6th", async () => {
    await seedTrips("free-a", 4);
    const fifth = await createTrip("free-a", lisbonWrite(), { member: false });
    assert.ok(fifth.id);
    await assert.rejects(
      () => createTrip("free-a", lisbonWrite(), { member: false }),
      (err) => err instanceof TripLimitError && err.limit === 5 && err.member === false,
    );
  });

  it("lets a member save past 5", async () => {
    await seedTrips("member-a", 5);
    const trip = await createTrip("member-a", lisbonWrite(), { member: true });
    assert.ok(trip.id);
  });

  it("stops a member at 200", async () => {
    await seedTrips("member-full", 200);
    await assert.rejects(
      () => createTrip("member-full", lisbonWrite(), { member: true }),
      (err) => err instanceof TripLimitError && err.limit === 200,
    );
  });

  it("reads membership itself when the caller does not pass it", async () => {
    await seedTrips("lookup", 5);
    storedMembership = ACTIVE;
    assert.ok((await createTrip("lookup", lisbonWrite())).id);
    storedMembership = CANCELED;
    await assert.rejects(() => createTrip("lookup", lisbonWrite()), TripLimitError);
    storedMembership = null;
  });

  it("never deletes trips over the limit", async () => {
    await seedTrips("lapsed", 9);
    await assert.rejects(() => createTrip("lapsed", lisbonWrite(), { member: false }), TripLimitError);
    const counted = await db.collection("users").doc("lapsed").collection("trips").count().get();
    assert.equal(counted.data().count, 9);
  });
});

function post(body) {
  return new Request("http://test/api/trips", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("POST /api/trips answers 409 trip_limit for a free reader at 5", async () => {
  session = { user: { id: "route-free", email: "free@example.com" } };
  storedMembership = null;
  await seedTrips("route-free", 5);
  const res = await tripsRoute.POST(post(lisbonWrite()));
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, record.TRIP_LIMIT_CODE);
  assert.equal(data.limit, 5);
  assert.equal(data.error, record.FREE_TRIP_LIMIT_MESSAGE);
});

test("POST /api/trips ignores a client that claims to be a member", async () => {
  session = { user: { id: "route-liar", email: "liar@example.com" } };
  storedMembership = null;
  await seedTrips("route-liar", 5);
  const res = await tripsRoute.POST(post({ ...lisbonWrite(), member: true, isPremium: true }));
  assert.equal(res.status, 409);
});

test("POST /api/trips saves the 6th trip for a member", async () => {
  session = { user: { id: "route-member", email: "member@example.com" } };
  storedMembership = ACTIVE;
  await seedTrips("route-member", 5);
  const res = await tripsRoute.POST(post(lisbonWrite()));
  assert.equal(res.status, 200);
  storedMembership = null;
});

test("POST /api/trips still needs a sign-in", async () => {
  session = null;
  const res = await tripsRoute.POST(post(lisbonWrite()));
  assert.equal(res.status, 401);
});
