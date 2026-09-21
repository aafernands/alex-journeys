import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyExistingPostPublish } from "../src/lib/cms/stamp-post.ts";
import { postUpdatedDisplayDate } from "../src/lib/dates.ts";

describe("applyExistingPostPublish", () => {
  const now = "2026-09-21T15:04:05.000Z";
  const firstPublished = "2025-08-28T08:19:33";

  it("stamps updatedAt on Update & publish of an existing post", () => {
    const stamped = applyExistingPostPublish(
      { date: "2025-08-28T12:00:00" },
      { update: true, existingDate: firstPublished },
      now,
    );
    assert.equal(stamped.updatedAt, now);
    assert.equal(stamped.date, firstPublished);
  });

  it("does not rewrite date when the editor changes the calendar day", () => {
    const stamped = applyExistingPostPublish(
      { date: "2026-01-02T12:00:00" },
      { update: true, existingDate: firstPublished },
      now,
    );
    assert.equal(stamped.date, "2026-01-02T12:00:00");
    assert.equal(stamped.updatedAt, now);
  });

  it("does not stamp updatedAt on first publish", () => {
    const stamped = applyExistingPostPublish(
      { date: "2026-09-21T12:00:00" },
      { update: false, existingDate: null },
      now,
    );
    assert.equal(stamped.updatedAt, undefined);
    assert.equal(stamped.date, "2026-09-21T12:00:00");
  });

  it("does not stamp updatedAt for draft-like saves (no update flag)", () => {
    const stamped = applyExistingPostPublish(
      { date: "2025-08-28T12:00:00" },
      { update: false, existingDate: firstPublished },
      now,
    );
    assert.equal(stamped.updatedAt, undefined);
    assert.equal(stamped.date, "2025-08-28T12:00:00");
  });
});

describe("postUpdatedDisplayDate", () => {
  it("prefers updatedAt when present", () => {
    assert.equal(
      postUpdatedDisplayDate({
        date: "2025-08-28T08:19:33",
        updatedAt: "2026-09-21T15:04:05.000Z",
      }),
      "2026-09-21T15:04:05.000Z",
    );
  });

  it("falls back to date", () => {
    assert.equal(
      postUpdatedDisplayDate({ date: "2025-08-28T08:19:33" }),
      "2025-08-28T08:19:33",
    );
  });
});
