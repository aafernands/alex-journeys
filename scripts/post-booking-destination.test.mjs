import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as postTypes from "../src/lib/post-types.ts";

describe("post booking destination", () => {
  it("normalizes the post-specific destination used by booking tools", () => {
    assert.equal(typeof postTypes.normalizeBookingDestination, "function");
    assert.equal(
      postTypes.normalizeBookingDestination(
        "  Niagara Falls, New York, United States  ",
      ),
      "Niagara Falls, New York, United States",
    );
    assert.equal(postTypes.normalizeBookingDestination(null), "");
  });

  it("requires a post-specific destination only when booking tools are enabled", () => {
    assert.equal(typeof postTypes.isBookingDestinationMissing, "function");
    assert.equal(
      postTypes.isBookingDestinationMissing(["flight", "hotel"], "   "),
      true,
    );
    assert.equal(
      postTypes.isBookingDestinationMissing(
        ["experience"],
        "Niagara Falls, New York, United States",
      ),
      false,
    );
    assert.equal(postTypes.isBookingDestinationMissing([], ""), false);
  });

  it("uses the first place segment as the public booking-card label", () => {
    assert.equal(typeof postTypes.bookingDestinationLabel, "function");
    assert.equal(
      postTypes.bookingDestinationLabel("Niagara Falls, New York, United States"),
      "Niagara Falls",
    );
    assert.equal(postTypes.bookingDestinationLabel("Iceland"), "Iceland");
  });
});
