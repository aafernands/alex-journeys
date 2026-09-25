import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { initialPlannerState } from "../src/lib/trip-planner-model.ts";
import {
  buildTripPdf,
  parsePackingList,
  redactPaymentDetails,
  resolveTripTravelerName,
  tripPdfFilename,
} from "../src/lib/trip-pdf.ts";
import { renderTripPdf } from "../src/lib/trip-pdf-render.ts";
import { isIosLike } from "../src/lib/trip-pdf-save.ts";
import { createTripItem, tripDays } from "../src/lib/trip-record.ts";

const CARD = "4242424242424242";

function sampleSource() {
  const state = {
    ...initialPlannerState(),
    destination: "Reykjavík, Iceland",
    startDate: "2026-10-12",
    endDate: "2026-10-15",
    categories: ["flights", "hotel", "car"],
    origin: "EWR",
  };
  const days = tripDays(state, true);
  const items = [
    createTripItem({
      type: "flight",
      title: "Icelandair to Keflavík",
      confirmation: "FI623",
      departureDate: "2026-10-12",
      departureTime: "08:40",
      returnDate: "2026-10-15",
      returnTime: "17:10",
      status: "booked",
      sortOrder: 0,
      notes: "Paid $640. Card number 4242 4242 4242 4242 CVV 123",
    }),
    createTripItem({
      type: "hotel",
      title: "Hotel Borg",
      confirmation: "HTL9921",
      checkinDate: "2026-10-12",
      checkinTime: "15:00",
      checkoutDate: "2026-10-15",
      checkoutTime: "11:00",
      status: "booked",
      sortOrder: 1,
      notes: "Address: Pósthússtræti 11, Reykjavík\nQuiet room. Total $1,240",
    }),
    createTripItem({
      type: "activity",
      title: "Blue Lagoon",
      dayIndex: 2,
      time: "10:30",
      confirmation: "LAGOON8",
      status: "booked",
      sortOrder: 2,
      notes: "Bring a towel.",
    }),
    createTripItem({
      type: "car",
      title: "Compact car",
      pickupDate: "2026-10-12",
      pickupTime: "11:30",
      dropoffDate: "2026-10-15",
      dropoffTime: "14:00",
      pickupLocation: "Keflavík Airport",
      dropoffLocation: "Reykjavík city center",
      confirmation: "CAR55",
      status: "booked",
      sortOrder: 3,
    }),
    createTripItem({
      type: "other",
      title: "Travel insurance",
      confirmation: "INS440",
      status: "booked",
      sortOrder: 4,
      notes: `Policy on file. Card ${CARD}.`,
    }),
    createTripItem({
      type: "note",
      title: "Grocery stop",
      dayIndex: 3,
      time: "18:00",
      sortOrder: 5,
      notes: "Bonus market near the harbor.",
    }),
  ];
  return {
    title: "Iceland in October",
    destination: state.destination,
    dates: "Oct 12–15, 2026",
    days,
    items,
    packingNotes: [
      "Documents",
      "[x] Passport",
      "[ ] Printed insurance",
      "",
      "Clothes",
      "[x] Walking shoes",
      "[ ] Rain jacket",
      "",
      "Toiletries",
      "[ ] Sunscreen",
    ].join("\n"),
  };
}

test("packing notes become a checklist grouped by category", () => {
  const groups = parsePackingList(sampleSource().packingNotes);
  assert.deepEqual(
    groups.map((group) => group.title),
    ["Documents", "Clothes", "Toiletries"],
  );
  assert.equal(groups[0].items[0].checked, true);
  assert.equal(groups[0].items[1].checked, false);
  assert.equal(groups[2].items[0].label, "Sunscreen");
  assert.equal(groups[2].items[0].checked, false);
  assert.deepEqual(parsePackingList("Passport\nWalking shoes"), [
    {
      title: "To pack",
      items: [
        { label: "Passport", checked: false },
        { label: "Walking shoes", checked: false },
      ],
    },
  ]);
  assert.deepEqual(parsePackingList("   "), []);
});

test("payment details are removed and prices and addresses stay", () => {
  assert.equal(redactPaymentDetails(`Card ${CARD} CVV 999`), "");
  assert.doesNotMatch(redactPaymentDetails("ending in 4242"), /4242/);
  const bookings = buildTripPdf(sampleSource(), "bookings");
  const stay = bookings.blocks.find(
    (block) => block.type === "booking" && block.kind === "Stay",
  );
  const flight = bookings.blocks.find(
    (block) => block.type === "booking" && block.kind === "Flight",
  );
  const experience = bookings.blocks.find(
    (block) => block.type === "booking" && block.kind === "Experience",
  );
  const car = bookings.blocks.find(
    (block) => block.type === "booking" && block.kind === "Car",
  );
  const forwarded = bookings.blocks.find(
    (block) => block.type === "booking" && block.kind === "Forwarded confirmation",
  );
  assert.ok(stay && stay.type === "booking");
  assert.equal(stay.rows.find((row) => row.label === "Price")?.value, "$1,240");
  assert.equal(stay.rows.find((row) => row.label === "Confirmation")?.value, "HTL9921");
  assert.match(stay.rows.find((row) => row.label === "Address")?.value ?? "", /Pósthússtræti/);
  assert.doesNotMatch(stay.notes, /Pósthússtræti/);
  assert.doesNotMatch(stay.notes, /address/i);
  assert.match(stay.notes, /Quiet room/);
  assert.doesNotMatch(stay.notes, /Total/);
  assert.ok(flight && flight.type === "booking");
  assert.match(flight.rows.find((row) => row.label === "Departs")?.value ?? "", /08:40/);
  assert.equal(flight.rows.find((row) => row.label === "Price")?.value, "$640");
  assert.doesNotMatch(flight.notes, /4242/);
  assert.doesNotMatch(flight.notes, /CVV/i);
  assert.ok(experience && experience.type === "booking");
  assert.match(experience.rows.find((row) => row.label === "When")?.value ?? "", /10:30/);
  assert.ok(car && car.type === "booking");
  assert.equal(
    car.rows.find((row) => row.label === "Pick-up address")?.value,
    "Keflavík Airport",
  );
  assert.ok(forwarded && forwarded.type === "booking");
  assert.doesNotMatch(JSON.stringify(bookings), new RegExp(CARD));
  assert.equal(
    bookings.blocks.some((block) => block.type === "booking" && block.title === "Grocery stop"),
    false,
  );
});

test("itinerary is by day and empty sections stay friendly", () => {
  const source = sampleSource();
  const itinerary = buildTripPdf(source, "itinerary");
  const days = itinerary.blocks.filter(
    (block) => block.type === "day" && block.label.startsWith("Day"),
  );
  assert.equal(days.length, 4);
  assert.equal(
    itinerary.blocks.some(
      (block) => block.type === "day" && block.label === "Not on a day yet",
    ),
    true,
  );
  const firstPlans = [];
  let seen = false;
  for (const block of itinerary.blocks) {
    if (block.type === "day") {
      if (seen) break;
      seen = true;
      continue;
    }
    if (seen && block.type === "plan") firstPlans.push(block);
  }
  assert.equal(firstPlans[0]?.time, "08:40");
  assert.match(firstPlans[0]?.title ?? "", /Icelandair/);
  assert.equal(
    itinerary.blocks.some(
      (block) => block.type === "message" && block.text === "Nothing planned yet.",
    ),
    true,
  );
  const empty = buildTripPdf(
    { ...source, items: [], packingNotes: "", days: [] },
    "everything",
  );
  const messages = empty.blocks.filter((block) => block.type === "message");
  assert.equal(messages.length, 3);
  assert.match(messages[0].text, /No days or plans yet/);
  assert.match(messages[1].text, /Nothing to pack yet/);
  assert.match(messages[2].text, /No bookings yet/);
});

test("filenames stay safe and iPhone uses the share sheet", () => {
  assert.equal(
    tripPdfFilename("Iceland in October", "itinerary"),
    "iceland-in-october-itinerary.pdf",
  );
  assert.equal(tripPdfFilename("São Paulo!", "packing"), "sao-paulo-packing-list.pdf");
  assert.equal(tripPdfFilename("   ", "everything"), "trip-trip.pdf");
  assert.equal(
    isIosLike({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    isIosLike({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    isIosLike({
      userAgent: "Mozilla/5.0 (Linux; Android 14)",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    }),
    false,
  );
});

test("traveler name prefers the signed-in name, then a booking", () => {
  const source = sampleSource();
  assert.equal(buildTripPdf(source, "itinerary").travelerName, "");
  const fromNotes = {
    ...source,
    items: source.items.map((item, index) =>
      index === 0 ? { ...item, notes: "Passenger: Mina Costa\nWindow seat" } : item,
    ),
  };
  assert.equal(resolveTripTravelerName(fromNotes), "Mina Costa");
  assert.equal(
    resolveTripTravelerName({
      ...fromNotes,
      travelerName: "Alex Fernandes",
      bookingNames: ["Someone Else"],
    }),
    "Alex Fernandes",
  );
  assert.equal(
    resolveTripTravelerName({
      ...source,
      travelerName: "Account",
      bookingNames: ["alex@example.com", "Jonah Adeyemi"],
    }),
    "Jonah Adeyemi",
  );
  assert.equal(
    buildTripPdf({ ...source, travelerName: "  " }, "packing").travelerName,
    "",
  );
});

test("the three sections render as PDFs without card numbers", async () => {
  const fonts = {
    outfit: readFileSync("public/fonts/pdf/Outfit-SemiBold.ttf"),
    inter: readFileSync("public/fonts/pdf/Inter-Regular.ttf"),
    interMedium: readFileSync("public/fonts/pdf/Inter-Medium.ttf"),
  };
  const logo = readFileSync("public/brand/logo-on-light.png");
  const source = sampleSource();
  const dir = mkdtempSync(join(tmpdir(), "trip-pdf-"));
  for (const section of ["itinerary", "packing", "bookings"]) {
    const model = buildTripPdf(
      section === "itinerary" ? { ...source, travelerName: "Alex Fernandes" } : source,
      section,
    );
    const bytes = await renderTripPdf(model, fonts, logo);
    assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), "%PDF-");
    assert.ok(bytes.byteLength > 2000);
    const file = join(dir, model.filename);
    writeFileSync(file, bytes);
    const text = spawnSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
    if (text.status !== 0) continue;
    assert.match(text.stdout, /Alex Journeys|ALEX JOURNEYS/);
    assert.match(text.stdout, /www\.fernandesjourneys\.com/);
    assert.match(text.stdout, /Iceland in October/);
    if (section === "itinerary") {
      assert.match(text.stdout, /Prepared for Alex Fernandes/);
    } else {
      assert.doesNotMatch(text.stdout, /Prepared for/);
    }
    assert.doesNotMatch(text.stdout, new RegExp(CARD));
    assert.doesNotMatch(text.stdout, /4242 4242/);
    if (section === "packing") {
      assert.match(text.stdout, /Documents/);
      assert.match(text.stdout, /Passport/);
    }
    if (section === "bookings") {
      assert.match(text.stdout, /STAY/);
      assert.match(text.stdout, /FLIGHT/);
      assert.match(text.stdout, /EXPERIENCE/);
      assert.match(text.stdout, /FORWARDED CONFIRMATION/);
      assert.match(text.stdout, /HTL9921/);
      assert.match(text.stdout, /\$1,240/);
    }
    if (section === "itinerary") {
      assert.match(text.stdout, /Day 1/);
      assert.match(text.stdout, /08:40/);
      assert.match(text.stdout, /Blue Lagoon/);
    }
  }
});
