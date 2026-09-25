import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  isFocusedBookingPath,
  isFocusedTripChrome,
  TRIP_FOCUS_BOOT,
} from "../src/lib/trip-focus.ts";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("focused booking routes", () => {
  it("treats stays and flights flows as focused tasks", () => {
    for (const path of [
      "/stays",
      "/stays/lp123",
      "/stays/lp123/checkout",
      "/stays/confirmation",
      "/flights",
      "/flights/book",
      "/flights/confirmation",
      "/experiences",
      "/experiences?dest=New%20York",
    ]) {
      assert.equal(isFocusedBookingPath(path), true, path);
    }
  });

  it("focuses saved trips and trip partner handoffs", () => {
    assert.equal(
      isFocusedTripChrome("/guides/plan-a-trip", "?trip=abc123"),
      true,
    );
    assert.equal(isFocusedTripChrome("/guides/plan-a-trip", ""), false);
    assert.equal(
      isFocusedTripChrome("/out", "?to=https%3A%2F%2Frentcars.com&aff=1&from=trip"),
      true,
    );
    assert.equal(isFocusedTripChrome("/out", "?to=https%3A%2F%2Fexample.com"), false);
    assert.equal(isFocusedTripChrome("/account", ""), false);
    assert.equal(isFocusedTripChrome("/blog", ""), false);
    assert.match(TRIP_FOCUS_BOOT, /plan-a-trip\.active\.v1/);
    assert.match(TRIP_FOCUS_BOOT, /experiences/);
    assert.match(TRIP_FOCUS_BOOT, /from/);
  });

  it("leaves discovery pages on the tab bar", () => {
    for (const path of [
      "/",
      "/blog",
      "/blog/a-note",
      "/destinations",
      "/guides/plan-a-trip",
      "/account",
      "/stays-and-more",
      "/flightsheet",
    ]) {
      assert.equal(isFocusedBookingPath(path), false, path);
    }
  });
});

describe("focused trip chrome wiring", () => {
  it("hides the ticker and tabs from booking routes and the open itinerary", () => {
    const header = source("../src/components/Header.tsx");
    assert.match(header, /useTripFocus/);
    assert.match(header, /site-alerts/);
    assert.match(header, /\{!mobileOpen && <MobileBottomNav \/>\}/);
    const nav = source("../src/components/header/MobileBottomNav.tsx");
    assert.match(nav, /const \{ focused \} = useTripFocus\(\)/);
    assert.match(nav, /const visible = !focused/);
    const planner = source("../src/components/trip-planner/TripPlanner.tsx");
    assert.ok(planner.indexOf("<TripWorkspaceFocus />") < planner.indexOf("<ItineraryHub"));
    assert.match(planner, /plan-workspace-shell/);
    const css = source("../src/app/globals.css");
    assert.match(planner, /TripDiscoveryChrome/);
    assert.match(css, /html\.trip-focus \.site-alerts/);
    assert.match(css, /body\.trip-focus \.site-alerts/);
    assert.match(css, /body\.trip-focus \.mobile-bottom-nav/);
    const layout = source("../src/app/layout.tsx");
    assert.match(layout, /TRIP_FOCUS_BOOT/);
    assert.match(css, /body\.trip-focus \.plan-trip-hotel/);
    assert.match(css, /dialog\[open\]/);
  });
});
