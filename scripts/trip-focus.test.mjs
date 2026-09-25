import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isFocusedBookingPath } from "../src/lib/trip-focus.ts";

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
    ]) {
      assert.equal(isFocusedBookingPath(path), true, path);
    }
  });

  it("leaves discovery pages on the tab bar", () => {
    for (const path of [
      "/",
      "/blog",
      "/blog/a-note",
      "/destinations",
      "/guides/plan-a-trip",
      "/account",
      "/experiences",
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
    assert.match(css, /body\.trip-focus \.site-alerts/);
    assert.match(css, /body\.trip-focus \.mobile-bottom-nav/);
    assert.match(css, /body\.trip-focus \.plan-trip-hotel/);
    assert.match(css, /dialog\[open\]/);
  });
});
