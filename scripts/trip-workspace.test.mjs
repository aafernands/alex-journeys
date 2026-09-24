import assert from "node:assert/strict";
import { test } from "node:test";
import { initialPlannerState } from "../src/lib/trip-planner-model.ts";
import {
  bookingProgress,
  validateTripSetup,
} from "../src/lib/trip-workspace.ts";

test("a trip can be created without choosing booking categories", () => {
  const state = {
    ...initialPlannerState(),
    destination: "Iceland",
    startDate: "2026-10-12",
    endDate: "2026-10-18",
  };
  assert.deepEqual(validateTripSetup(state, true), {});
  assert.ok(validateTripSetup({ ...state, destination: "" }, true).destination);
  assert.ok(
    validateTripSetup({ ...state, categories: ["flights"] }, true).origin,
  );
});

test("flexible setup still validates its month and nights", () => {
  const state = {
    ...initialPlannerState(),
    destination: "Iceland",
    dateMode: "flexible",
    month: "2026-10",
    nights: 6,
  };
  assert.deepEqual(validateTripSetup(state, true), {});
  assert.ok(validateTripSetup({ ...state, nights: 0 }, true).nights);
});

test("booking progress never claims mixed or empty plans are all booked", () => {
  assert.equal(bookingProgress([]), "Not added");
  assert.equal(bookingProgress([{ status: "todo" }]), "Planned");
  assert.equal(
    bookingProgress([{ status: "booked" }, { status: "todo" }]),
    "1 booked · 1 planned",
  );
  assert.equal(bookingProgress([{ status: "skipped" }]), "Not needed");
  assert.equal(
    bookingProgress([{ status: "booked" }, { status: "skipped" }]),
    "Booked",
  );
});
