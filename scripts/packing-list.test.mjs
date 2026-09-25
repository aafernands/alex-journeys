import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { collectPackingGuides } from "../src/lib/packing-guides.ts";
import {
  addPackingTemplate,
  addQuickPackingItem,
  dismissPackingSuggestion,
  packingPdfGroups,
  packingSuggestions,
  readPackingList,
  uncheckAllPacking,
  writePackingList,
} from "../src/lib/packing-list.ts";
import { buildTripPdf, parsePackingList } from "../src/lib/trip-pdf.ts";
import { cleanPackingNotes } from "../src/lib/trip-record.ts";

const LEGACY = [
  "Documents",
  "[x] Passport",
  "[ ] Printed insurance",
  "",
  "Clothes",
  "[x] Walking shoes",
  "[ ] Underwear x 4",
  "",
  "Passport",
  "Walking shoes",
].join("\n");

test("old checkbox notes keep every line, check, and category", () => {
  const headed = [
    "Documents",
    "[x] Passport",
    "[ ] Printed insurance",
    "",
    "Clothes",
    "[ ] Underwear x 4",
    "",
    "Snacks",
    "[x] Granola",
  ].join("\n");
  const list = readPackingList(headed);
  assert.equal(list.unreadable, false);
  assert.deepEqual(
    list.items.map((item) => [item.category, item.label, item.quantity, item.packed]),
    [
      ["documents", "Passport", 1, true],
      ["documents", "Printed insurance", 1, false],
      ["clothes", "Underwear", 4, false],
      ["Snacks", "Granola", 1, true],
    ],
  );
  const plain = readPackingList("Passport\nWalking shoes");
  assert.deepEqual(
    plain.items.map((item) => [item.category, item.label, item.packed]),
    [
      ["documents", "Passport", false],
      ["clothes", "Walking shoes", false],
    ],
  );
  assert.deepEqual(parsePackingList("Passport\nWalking shoes")[0]?.title, "To pack");
  assert.deepEqual(parsePackingList("   "), []);
});

test("a saved checklist round-trips and still fits the trip field", () => {
  const saved = writePackingList({
    items: [
      {
        id: "p1",
        category: "clothes",
        label: "Underwear",
        quantity: 4,
        packed: true,
        who: "",
      },
      {
        id: "p2",
        category: "documents",
        label: "Passport",
        quantity: 1,
        packed: false,
        who: "kids",
      },
    ],
    dismissed: ["dest-coat"],
    unreadable: false,
  });
  const cleaned = cleanPackingNotes(saved);
  const list = readPackingList(`  ${cleaned}  `);
  assert.equal(list.items[0]?.packed, true);
  assert.equal(list.items[0]?.quantity, 4);
  assert.equal(list.items[1]?.who, "kids");
  assert.deepEqual(list.dismissed, ["dest-coat"]);
  assert.ok(cleaned.startsWith("@@ajpack1"));
  assert.ok(cleaned.length < 16000);
  assert.equal(cleanPackingNotes("x".repeat(20000)).length, 16000);
});

test("templates follow trip length and do not duplicate items", () => {
  const ctx = {
    nights: 4,
    destination: "Lisbon",
    categories: ["flights"],
    itemTypes: ["flight"],
    adults: 2,
    children: 1,
  };
  const once = addPackingTemplate(
    { items: [], dismissed: [], unreadable: false },
    "essentials",
    ctx,
  );
  const underwear = once.items.find((item) => item.label === "Underwear");
  assert.equal(underwear?.quantity, 4);
  assert.equal(underwear?.category, "clothes");
  const twice = addPackingTemplate(once, "essentials", ctx);
  assert.equal(twice.items.length, once.items.length);
  const kids = addPackingTemplate(once, "kids", ctx);
  const outfits = kids.items.find((item) => item.label === "Kids outfits");
  assert.equal(outfits?.quantity, 4);
  assert.equal(outfits?.who, "kids");
  const quick = addQuickPackingItem(once, "2 adapters");
  const adapter = quick.items.at(-1);
  assert.equal(adapter?.label, "adapters");
  assert.equal(adapter?.quantity, 2);
  assert.equal(adapter?.category, "tech");
});

test("suggestions come from the trip and stay dismissed", () => {
  const ctx = {
    nights: 5,
    destination: "Reykjavík, Iceland",
    categories: ["flights", "hotel", "car"],
    itemTypes: [],
    adults: 2,
    children: 0,
  };
  const empty = { items: [], dismissed: [], unreadable: false };
  const ideas = packingSuggestions(empty, ctx);
  assert.ok(ideas.some((idea) => idea.label === "Passport"));
  assert.ok(ideas.some((idea) => idea.label === "Driver's license"));
  assert.ok(ideas.some((idea) => idea.label === "Stay confirmation"));
  assert.ok(ideas.some((idea) => idea.label === "Warm coat"));
  assert.equal(ideas.some((idea) => idea.label === "Swimsuit"), false);
  const beach = packingSuggestions(empty, { ...ctx, destination: "Cancun, Mexico", categories: [] });
  assert.ok(beach.some((idea) => idea.label === "Swimsuit"));
  assert.equal(beach.some((idea) => idea.label === "Passport"), false);
  const dismissed = dismissPackingSuggestion(empty, "flight-passport");
  assert.equal(
    packingSuggestions(dismissed, ctx).some((idea) => idea.id === "flight-passport"),
    false,
  );
  const cleared = uncheckAllPacking({
    ...empty,
    items: [
      {
        id: "p1",
        category: "documents",
        label: "Passport",
        quantity: 1,
        packed: true,
        who: "",
      },
    ],
  });
  assert.equal(cleared.items[0]?.packed, false);
});

test("the packing PDF keeps categories, checks, and quantities", () => {
  const groups = packingPdfGroups(LEGACY.split("\n").slice(0, 7).join("\n"));
  assert.deepEqual(
    groups.map((group) => group.title),
    ["Clothes", "Documents"],
  );
  const passport = groups
    .flatMap((group) => group.items)
    .find((item) => item.label.startsWith("Passport"));
  assert.equal(passport?.checked, true);
  const underwear = groups
    .flatMap((group) => group.items)
    .find((item) => item.label.startsWith("Underwear"));
  assert.equal(underwear?.label, "Underwear × 4");
  const notes = writePackingList({
    items: [
      {
        id: "p1",
        category: "clothes",
        label: "Underwear",
        quantity: 4,
        packed: true,
        who: "",
      },
      {
        id: "p2",
        category: "documents",
        label: "Passport",
        quantity: 1,
        packed: false,
        who: "kids",
      },
    ],
    dismissed: [],
    unreadable: false,
  });
  const pdf = buildTripPdf(
    {
      title: "Lisbon",
      destination: "Lisbon",
      dates: "May 2–6",
      days: [],
      items: [],
      packingNotes: notes,
    },
    "packing",
  );
  const checks = pdf.blocks.filter((block) => block.type === "check");
  assert.equal(checks[0]?.type === "check" && checks[0].label, "Underwear × 4");
  assert.equal(checks[0]?.type === "check" && checks[0].checked, true);
  assert.equal(checks[1]?.type === "check" && checks[1].label, "Passport (Kids)");
});

test("packing guides are real posts about packing and gadgets", () => {
  const index = JSON.parse(
    readFileSync(new URL("../src/content/posts/_index.json", import.meta.url), "utf8"),
  );
  const guides = collectPackingGuides(index.posts);
  assert.deepEqual(
    guides.map((guide) => guide.slug),
    ["travel-with-minimal-luggage", "travel-tech-essentials"],
  );
  assert.equal(guides[0]?.topics.includes("packing"), true);
  assert.equal(guides[1]?.topics.includes("tech"), true);
  assert.equal(guides[0]?.href, "/travel-with-minimal-luggage");
  assert.match(guides[1]?.title ?? "", /Gadgets/);
});
