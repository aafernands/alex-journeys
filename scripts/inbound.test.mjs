import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  INBOUND_NAME_FALLBACK,
  createInboundToken,
  firstAvailableLocalPart,
  formatInboundAddress,
  inboundLocalPartAttempts,
  isFriendlyInboundLocalPart,
  isInboundLocalPart,
  isInboundToken,
  slugifyInboundName,
  tokensFromRecipients,
} from "../src/lib/inbound-address.ts";
import {
  formatInboundWhen,
  parseInboundEmail,
  suggestionToTripItem,
} from "../src/lib/inbound-parse.ts";
import {
  parseReceivedEvent,
  parseSampleEmail,
  unwrapReceivedContent,
  verifyResendWebhook,
} from "../src/lib/inbound-webhook.ts";

const DOMAIN = "inbound.fernandesjourneys.com";
const TOKEN = "ab".repeat(16);

function unitedText() {
  const sample = JSON.parse(
    readFileSync(new URL("./fixtures/inbound-sample.json", import.meta.url), "utf8"),
  );
  return sample;
}

function makeRandom(seed = 1) {
  let state = seed >>> 0;
  return (exclusiveMax) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return exclusiveMax <= 1 ? 0 : state % exclusiveMax;
  };
}

describe("forward address", () => {
  it("reads a legacy hex token and a plus-address on the inbound host only", () => {
    assert.equal(isInboundToken(TOKEN), true);
    assert.equal(isInboundToken(TOKEN.toUpperCase()), false);
    assert.equal(isFriendlyInboundLocalPart(TOKEN), false);
    assert.equal(isInboundLocalPart(TOKEN), true);
    assert.equal(formatInboundAddress(TOKEN, DOMAIN), `${TOKEN}@${DOMAIN}`);
    const legacy = createInboundToken();
    assert.equal(isInboundToken(legacy), true);
    assert.equal(legacy.length, 32);
    assert.deepEqual(
      tokensFromRecipients(
        [
          `Trip <trip+${TOKEN}@${DOMAIN}>`,
          `other@example.com`,
          `not-a-token@${DOMAIN}`,
        ],
        DOMAIN,
      ),
      [TOKEN],
    );
  });

  it("slugifies a first name and falls back when there is nothing to keep", () => {
    assert.equal(slugifyInboundName("Alex Fernandes"), "alex");
    assert.equal(slugifyInboundName("  Mary-Jane   O'Brien "), "mary-jane");
    assert.equal(slugifyInboundName("José María"), "jose");
    assert.equal(slugifyInboundName("Søren"), "soren");
    assert.equal(slugifyInboundName("Ægir"), "aegir");
    assert.equal(slugifyInboundName("Åsa"), "asa");
    assert.equal(slugifyInboundName("O'Brien"), "obrien");
    assert.equal(slugifyInboundName("Straße"), "strasse");
    assert.equal(slugifyInboundName("Alex2"), "alex2");
    assert.equal(slugifyInboundName("A".repeat(80)), "a".repeat(40));
    assert.equal(slugifyInboundName(""), INBOUND_NAME_FALLBACK);
    assert.equal(slugifyInboundName("   "), INBOUND_NAME_FALLBACK);
    assert.equal(slugifyInboundName(null), INBOUND_NAME_FALLBACK);
    assert.equal(slugifyInboundName("李明"), INBOUND_NAME_FALLBACK);
  });

  it("assigns firstname-NN, then a longer suffix only after 00–99 are taken", () => {
    const rng = makeRandom(4);
    const attempts = inboundLocalPartAttempts("Alex Fernandes", rng);
    const twoDigit = attempts.filter((local) => /^alex-\d{2}$/.test(local));
    const threeDigit = attempts.filter((local) => /^alex-\d{3}$/.test(local));
    const fourDigit = attempts.filter((local) => /^alex-\d{4}$/.test(local));
    assert.equal(new Set(twoDigit).size, 100);
    assert.equal(threeDigit.length >= 1 && threeDigit.length <= 24, true);
    assert.equal(fourDigit.length >= 1 && fourDigit.length <= 16, true);
    assert.equal(attempts.length, twoDigit.length + threeDigit.length + fourDigit.length);
    assert.equal(
      attempts.findIndex((local) => /^alex-\d{3,4}$/.test(local)),
      100,
    );
    assert.notDeepEqual(
      twoDigit.map((local) => local.slice("alex-".length)),
      Array.from({ length: 100 }, (_, index) => String(index).padStart(2, "0")),
    );
    for (const local of attempts) {
      assert.equal(isFriendlyInboundLocalPart(local), true);
      assert.equal(isInboundToken(local), false);
    }

    const open = firstAvailableLocalPart(attempts, new Set());
    assert.match(open, /^alex-\d{2}$/);
    assert.equal(formatInboundAddress(open, DOMAIN), `${open}@${DOMAIN}`);

    const skipped = firstAvailableLocalPart(attempts, new Set([attempts[0]]));
    assert.match(skipped, /^alex-\d{2}$/);
    assert.notEqual(skipped, attempts[0]);

    const takenTwo = new Set(twoDigit);
    const overflow = firstAvailableLocalPart(attempts, takenTwo);
    assert.match(overflow, /^alex-\d{3}$/);
    assert.equal(takenTwo.has(overflow), false);

    const takenThroughThree = new Set(attempts.filter((local) => /^alex-\d{2,3}$/.test(local)));
    const wider = firstAvailableLocalPart(attempts, takenThroughThree);
    assert.match(wider, /^alex-\d{4}$/);
    assert.equal(firstAvailableLocalPart(attempts, new Set(attempts)), null);
    assert.match(inboundLocalPartAttempts(null, rng)[0], /^trip-\d{2}$/);
  });

  it("resolves friendly addresses and legacy hex tokens on the same inbound host", () => {
    assert.equal(isInboundLocalPart("alex-24"), true);
    assert.equal(isInboundLocalPart("alex-024"), true);
    assert.equal(isInboundLocalPart("alex-7"), false);
    assert.equal(isFriendlyInboundLocalPart("not-a-token"), false);
    assert.deepEqual(
      tokensFromRecipients(
        [
          `Alex <Alex-24@${DOMAIN}>`,
          `trip+${TOKEN}@${DOMAIN}`,
          `alex-7@${DOMAIN}`,
          `alex-10000@${DOMAIN}`,
          `notes+alex-24@${DOMAIN}`,
          `other@example.com`,
        ],
        DOMAIN,
      ),
      ["alex-24", TOKEN],
    );
  });
});

describe("inbound parsers", () => {
  it("reads a United confirmation from the sample fixture", () => {
    const sample = unitedText();
    const parsed = parseInboundEmail({ subject: sample.subject, text: sample.text });
    assert.equal(parsed.length, 1);
    const flight = parsed[0];
    assert.equal(flight.type, "flight");
    assert.equal(flight.confirmation, "ABC123");
    assert.equal(flight.startDate, "2027-04-12");
    assert.equal(flight.time, "18:15");
    assert.match(flight.title, /UA 1234/);
    assert.match(flight.title, /EWR to LIS/);
    assert.match(flight.url, /united\.com/);
    assert.match(formatInboundWhen(flight), /Conf\. ABC123/);
  });

  it("reads an Airbnb stay with check-in and check-out", () => {
    const parsed = parseInboundEmail({
      subject: "Reservation confirmed — Alfama apartment",
      text: [
        "Check-in: Monday, April 12, 2027",
        "Check-out: April 19, 2027",
        "Confirmation code: HMAB12CD",
        "View trip: https://www.airbnb.com/trips/HMAB12CD",
      ].join("\n"),
    });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].type, "hotel");
    assert.equal(parsed[0].confirmation, "HMAB12CD");
    assert.equal(parsed[0].startDate, "2027-04-12");
    assert.equal(parsed[0].endDate, "2027-04-19");
    assert.match(parsed[0].title, /Alfama/);
    assert.match(parsed[0].url, /airbnb\.com/);
  });

  it("reads a Hertz pickup", () => {
    const parsed = parseInboundEmail({
      subject: "Hertz reservation confirmation",
      text: [
        "Confirmation #: L123456789",
        "Pick-up: Apr 12, 2027 10:00 AM",
        "Drop-off: Apr 19, 2027",
        "Lisbon Airport",
      ].join("\n"),
    });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].type, "car");
    assert.equal(parsed[0].confirmation, "L123456789");
    assert.equal(parsed[0].startDate, "2027-04-12");
    assert.equal(parsed[0].endDate, "2027-04-19");
    assert.equal(parsed[0].time, "10:00");
    assert.match(parsed[0].title, /Hertz/);
  });

  it("reads a Booking.com stay from the subject and body", () => {
    const parsed = parseInboundEmail({
      subject: "Booking.com confirmation",
      text: [
        "Your booking at Hotel Lisboa is confirmed.",
        "Confirmation number: 1234567890",
        "Check-in 12 April 2027",
        "Check-out 19 April 2027",
        "https://www.booking.com/confirmation.html",
      ].join("\n"),
    });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].type, "hotel");
    assert.equal(parsed[0].confirmation, "1234567890");
    assert.equal(parsed[0].startDate, "2027-04-12");
    assert.equal(parsed[0].endDate, "2027-04-19");
    assert.match(parsed[0].title, /Hotel Lisboa/);
  });

  it("strips HTML and does not keep the markup", () => {
    const parsed = parseInboundEmail({
      subject: "Reservation confirmed — Alfama apartment",
      html: "<p>Check-in April 12, 2027</p><p>Check-out April 19, 2027</p><p>Confirmation code: HMAB12CD</p><a href=\"https://www.airbnb.com/trips\">trip</a>",
    });
    assert.equal(parsed[0]?.type, "hotel");
    assert.equal(JSON.stringify(parsed).includes("<p>"), false);
  });

  it("turns a vague forward into one reviewable suggestion, and skips an empty note", () => {
    const vague = parseInboundEmail({
      subject: "Fwd: This week in Lisbon",
      text: "Five cafes I loved near the river.",
    });
    assert.equal(vague.length, 1);
    assert.equal(vague[0].type, "other");
    assert.match(vague[0].title, /Lisbon/);

    assert.deepEqual(
      parseInboundEmail({ subject: "Your booking confirmation", text: "Thanks." }),
      [],
    );
    assert.deepEqual(parseInboundEmail({ subject: "  ", text: "" }), []);
  });

  it("builds a booked itinerary item on the matching day", () => {
    const [flight] = parseInboundEmail({
      subject: unitedText().subject,
      text: unitedText().text,
    });
    const item = suggestionToTripItem(flight, {
      sortOrder: 3,
      days: [{ index: 1, date: "2027-04-12", label: "Day 1", detail: "Mon · Apr 12" }],
      laneKey: "expedia",
    });
    assert.equal(item.type, "flight");
    assert.equal(item.status, "booked");
    assert.equal(item.confirmation, "ABC123");
    assert.equal(item.dayIndex, 1);
    assert.equal(item.time, "18:15");
    assert.equal(item.laneKey, "expedia");
    assert.equal(item.sortOrder, 3);
  });
});

describe("resend webhook", () => {
  it("accepts a Svix signature and rejects tampering or a stale timestamp", () => {
    const secretBytes = Buffer.from("inbound-test-secret-key!!", "utf8");
    const secret = `whsec_${secretBytes.toString("base64")}`;
    const payload = JSON.stringify({
      type: "email.received",
      data: {
        email_id: "56761188-7520-42d8-8898-ff6fc54ce618",
        to: [`${TOKEN}@${DOMAIN}`],
        subject: "Your United Airlines booking confirmation",
      },
    });
    const id = "msg_test_inbound";
    const nowMs = Date.parse("2026-09-21T12:00:00.000Z");
    const timestamp = String(Math.floor(nowMs / 1000));
    const signature = createHmac("sha256", secretBytes)
      .update(`${id}.${timestamp}.${payload}`)
      .digest("base64");

    const ok = verifyResendWebhook({
      payload,
      id,
      timestamp,
      signature: `v1,not-the-sig v1,${signature}`,
      secret,
      nowMs,
    });
    assert.equal(ok, true);
    assert.equal(
      verifyResendWebhook({
        payload: `${payload} `,
        id,
        timestamp,
        signature: `v1,${signature}`,
        secret,
        nowMs,
      }),
      false,
    );
    assert.equal(
      verifyResendWebhook({
        payload,
        id,
        timestamp: String(Math.floor(nowMs / 1000) - 3600),
        signature: `v1,${signature}`,
        secret,
        nowMs,
      }),
      false,
    );

    const event = parseReceivedEvent(JSON.parse(payload));
    assert.equal(event?.emailId, "56761188-7520-42d8-8898-ff6fc54ce618");
    assert.deepEqual(tokensFromRecipients(event?.recipients ?? [], DOMAIN), [TOKEN]);
    assert.equal(parseReceivedEvent({ type: "email.sent", data: {} }), null);
  });

  it("reads a receiving API body without requiring the HTML to be stored", () => {
    const content = unwrapReceivedContent({
      object: "email",
      text: "Confirmation number: ABC123",
      html: "<p>secret markup</p>",
      subject: "Flight",
    });
    assert.equal(content.subject, "Flight");
    assert.match(content.text, /ABC123/);
    const parsed = parseInboundEmail(content);
    assert.equal(JSON.stringify(parsed).includes("secret markup"), false);
  });

  it("parses the sample harness body and rejects a missing address", () => {
    const sample = unitedText();
    const parsed = parseSampleEmail({ ...sample, to: `${TOKEN}@${DOMAIN}` });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.email.messageId, "sample-united-abc123");
    assert.deepEqual(parsed.email.recipients, [`${TOKEN}@${DOMAIN}`]);

    const missing = parseSampleEmail({ subject: "Hi", text: "Hello there friend" });
    assert.equal(missing.ok, false);
  });
});
