import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  formatInboundAddress,
  isInboundToken,
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

describe("forward address", () => {
  it("reads a trip token and a plus-address on the inbound host only", () => {
    assert.equal(isInboundToken(TOKEN), true);
    assert.equal(isInboundToken(TOKEN.toUpperCase()), false);
    assert.equal(formatInboundAddress(TOKEN, DOMAIN), `${TOKEN}@${DOMAIN}`);
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
