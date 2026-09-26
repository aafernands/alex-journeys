import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";
import {
  extractTicketNumber,
  generateTicketNumber,
  htmlToText,
  isTicketNumber,
  parseEmailAddress,
  statusAfterMessage,
  stripQuotedReply,
  validateNewTicket,
} from "../src/lib/support-tickets.ts";
import {
  staffTicketAlertEmail,
  ticketClosedEmail,
  ticketReceivedEmail,
  ticketReplyEmail,
} from "../src/lib/emails/support-templates.ts";

const ctx = { siteUrl: "https://www.alexjourneys.com", supportEmail: "support@alexjourneys.com", year: 2026 };

describe("support ticket helpers", () => {
  it("makes and finds ticket numbers", () => {
    const n = generateTicketNumber(new Date("2026-09-26T12:00:00Z"), () => 0.5);
    assert.equal(n, "AJ-2026-550000");
    assert.ok(isTicketNumber(n));
    assert.equal(isTicketNumber("AJ-2026-12"), false);
    assert.equal(isTicketNumber("../x"), false);
    assert.equal(extractTicketNumber("Re: We got your message [aj-2026-482913]"), "AJ-2026-482913");
    assert.equal(extractTicketNumber("Hello"), null);
  });

  it("validates the form", () => {
    const ok = validateNewTicket({ name: " Maria ", email: "MARIA@Example.com", topic: "Trip planner", message: "My trip won't save, help please." });
    assert.ok(ok.ok);
    assert.equal(ok.value.email, "maria@example.com");
    assert.equal(ok.value.subject, "Trip planner");
    assert.equal(validateNewTicket({ name: "M", email: "x", message: "long enough message" }).ok, false);
    assert.equal(validateNewTicket({ name: "M", email: "a@b.co", message: "short" }).ok, false);
    assert.equal(validateNewTicket({ name: "", email: "a@b.co", message: "long enough message" }).ok, false);
    const odd = validateNewTicket({ name: "M", email: "a@b.co", topic: "<script>", message: "long enough message" });
    assert.equal(odd.value.topic, "General question");
  });

  it("keeps only the new part of an emailed reply", () => {
    const text = [
      "Thanks, that worked!",
      "",
      "On Fri, Sep 25, 2026 at 3:00 PM Alex Journeys <support@alexjourneys.com> wrote:",
      "> Hi Maria,",
      "> Try this.",
    ].join("\n");
    assert.equal(stripQuotedReply(text), "Thanks, that worked!");
    const split = "Great\n\nOn Fri, Sep 25, 2026 at 3:00 PM Alex\nJourneys <x@y.z> wrote:\n> old";
    assert.equal(stripQuotedReply(split), "Great");
    assert.equal(stripQuotedReply("Hi\n-----Original Message-----\nold"), "Hi");
    assert.equal(stripQuotedReply("> only quoted"), "");
    assert.equal(htmlToText("<p>Hello&nbsp;there</p><blockquote>old</blockquote><div>Bye</div>"), "Hello there\nBye");
  });

  it("parses sender addresses and moves status", () => {
    assert.equal(parseEmailAddress("Maria Lopez <Maria@Example.com>"), "maria@example.com");
    assert.equal(parseEmailAddress("nope"), null);
    assert.equal(statusAfterMessage("closed", "customer"), "open");
    assert.equal(statusAfterMessage("open", "staff"), "waiting");
    assert.equal(statusAfterMessage("open", "staff", true), "closed");
  });
});

describe("support emails", () => {
  it("confirmation carries the reference number and the message", () => {
    const out = ticketReceivedEmail(
      { name: "Maria Lopez", ticketNumber: "AJ-2026-482913", topic: "Trip planner", subject: "Help", message: "Line one\nLine <two>", createdAt: "2026-09-26T12:00:00Z" },
      ctx,
    );
    assert.equal(out.subject, "We got your message [AJ-2026-482913]");
    assert.match(out.html, /Line one<br>Line &lt;two&gt;/);
    assert.match(out.text, /> Line one/);
    assert.match(out.html, /The Alex Journeys Team/);
  });

  it("reply, closed and staff alert emails", () => {
    const reply = ticketReplyEmail({ name: "Maria", ticketNumber: "AJ-2026-482913", subject: "Help", reply: "Try this", authorName: "Alex", closed: false }, ctx);
    assert.equal(reply.subject, "Re: Help [AJ-2026-482913]");
    assert.match(reply.text, /From Alex:/);
    const closed = ticketClosedEmail({ name: "Maria", ticketNumber: "AJ-2026-482913", subject: "Help" }, ctx);
    assert.match(closed.subject, /\[AJ-2026-482913\]$/);
    const alert = staffTicketAlertEmail({ kind: "new", name: "Maria", email: "m@x.co", ticketNumber: "AJ-2026-482913", topic: "T", subject: "Help", message: "Hi", cmsUrl: "https://x/cms/support/AJ-2026-482913" }, ctx);
    assert.match(alert.html, /cms\/support\/AJ-2026-482913/);
  });
});

/* ——— inbound replies ——— */

let ticket;
let added = [];
let staffAlerts = [];

mock.module("@/lib/support-store", {
  namedExports: {
    getTicket: async (n) => (ticket && n === ticket.ticketNumber ? { ticket, messages: [] } : null),
    addCustomerEmailReply: async (n, input) => {
      if (added.some((a) => a.providerMessageId === input.providerMessageId)) return { ticket, duplicate: true };
      added.push(input);
      return { ticket: { ...ticket, status: "open" }, duplicate: false };
    },
  },
});
mock.module("@/lib/support-notify", {
  namedExports: {
    notifyStaff: async (t, kind, body) => {
      staffAlerts.push({ kind, body });
      return { status: "sent" };
    },
  },
});

const { ingestSupportReply } = await import("../src/lib/support-inbound.ts");

describe("inbound support replies", () => {
  beforeEach(() => {
    ticket = { ticketNumber: "AJ-2026-482913", email: "maria@example.com", name: "Maria", status: "waiting" };
    added = [];
    staffAlerts = [];
  });

  it("adds the reply when the sender matches", async () => {
    const result = await ingestSupportReply({
      emailId: "em_123456789",
      from: "Maria Lopez <Maria@example.com>",
      subject: "Re: Re: Help [AJ-2026-482913]",
      text: "Still stuck.\n\nOn Fri, Alex wrote:\n> old",
      html: "",
    });
    assert.deepEqual(result, { stored: true, ticketNumber: "AJ-2026-482913" });
    assert.equal(added[0].body, "Still stuck.");
    assert.equal(added[0].authorName, "Maria Lopez");
    assert.equal(staffAlerts[0].kind, "reply");
  });

  it("ignores strangers, unknown tickets, duplicates and empty replies", async () => {
    const warn = mock.method(console, "warn", () => {});
    assert.equal((await ingestSupportReply({ emailId: "em_1aaaaaaaa", from: "evil@x.com", subject: "[AJ-2026-482913]", text: "hi", html: "" })).ignored, "sender_mismatch");
    warn.mock.restore();
    assert.equal((await ingestSupportReply({ emailId: "em_2aaaaaaaa", from: "maria@example.com", subject: "no number", text: "hi", html: "" })).ignored, "no_ticket_number");
    assert.equal((await ingestSupportReply({ emailId: "em_3aaaaaaaa", from: "maria@example.com", subject: "[AJ-2026-000000]", text: "hi", html: "" })).ignored, "unknown_ticket");
    assert.equal((await ingestSupportReply({ emailId: "em_4aaaaaaaa", from: "maria@example.com", subject: "[AJ-2026-482913]", text: "> quoted only", html: "" })).ignored, "empty");
    const first = await ingestSupportReply({ emailId: "em_5aaaaaaaa", from: "maria@example.com", subject: "[AJ-2026-482913]", text: "", html: "<p>Thanks!</p>" });
    assert.equal(first.stored, true);
    assert.equal(added[0].body, "Thanks!");
    const again = await ingestSupportReply({ emailId: "em_5aaaaaaaa", from: "maria@example.com", subject: "[AJ-2026-482913]", text: "Thanks!", html: "" });
    assert.equal(again.ignored, "duplicate");
    assert.equal(staffAlerts.length, 1);
  });
});
