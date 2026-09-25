import assert from "node:assert/strict";
import { test } from "node:test";
import { nativeShare } from "../src/lib/native-share.ts";

test("native share opens the device sheet with the trip snapshot", async () => {
  const data = { title: "Trip to Lisbon", url: "https://www.alexjourneys.com/guides/plan-a-trip?plan=example" };
  let received;
  assert.equal(await nativeShare(data, { share: async (payload) => { received = payload; } }), "shared");
  assert.deepEqual(received, data);
});

test("dismissed sharing does not trigger copy fallback", async () => {
  assert.equal(await nativeShare({}, { share: async () => { throw new DOMException("Dismissed", "AbortError"); } }), "cancelled");
});

test("unsupported or failed native sharing allows copy fallback", async () => {
  assert.equal(await nativeShare({}, {}), "unavailable");
  assert.equal(await nativeShare({}, { share: async () => { throw new Error("Unavailable"); } }), "unavailable");
});
