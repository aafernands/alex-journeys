import assert from "node:assert/strict";
import test from "node:test";
import { stayDetailSearchPath } from "../src/lib/stays.ts";

const current = {
  destination: "Miami, United States",
  startDate: "2026-10-09",
  endDate: "2026-10-11",
  adults: 2,
  children: 0,
  rooms: 1,
  sessionId: "123e4567-e89b-12d3-a456-426614174000",
  tripId: "trip-123",
};

test("editing stay dates keeps the selected hotel and the trip identifier", () => {
  const path = stayDetailSearchPath("hotel_123", current, {
    ...current,
    startDate: "2026-10-12",
    endDate: "2026-10-15",
  });
  assert.match(path, /^\/stays\/hotel_123\?/);
  assert.match(path, /start=2026-10-12/);
  assert.match(path, /end=2026-10-15/);
  assert.match(path, /trip=trip-123/);
});

test("changing destination searches the new city instead of showing the old hotel", () => {
  const path = stayDetailSearchPath("hotel_123", current, {
    ...current,
    destination: "Boston, United States",
  });
  assert.match(path, /^\/stays\?/);
  assert.match(path, /dest=Boston%2C\+United\+States/);
  assert.match(path, /trip=trip-123/);
});
