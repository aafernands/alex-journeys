import assert from "node:assert/strict";
import { beforeEach, describe, it, mock, test } from "node:test";
import {
  readerOwnsTicket,
  readerStatus,
  READER_STATUS_LABELS,
  sortByLatest,
  toReaderMessage,
  toReaderTicket,
  validateReaderReply,
} from "../src/lib/support-tickets.ts";
import { isSitePath, parseQuickAnswers } from "../src/lib/quick-answers.ts";

/* ---------------- pure helpers ---------------- */

describe("reader helpers", () => {
  it("maps statuses to plain words", () => {
    assert.equal(READER_STATUS_LABELS[readerStatus("open")], "We’re on it");
    assert.equal(READER_STATUS_LABELS[readerStatus("in_progress")], "We’re on it");
    assert.equal(READER_STATUS_LABELS[readerStatus("waiting")], "Replied — waiting on you");
    assert.equal(READER_STATUS_LABELS[readerStatus("closed")], "Resolved");
  });

  it("owns by account id, or by verified email only", () => {
    const reader = { userId: "u1", email: "me@x.com", emailVerified: true };
    assert.equal(readerOwnsTicket({ userId: "u1", email: "other@x.com" }, reader), true);
    assert.equal(readerOwnsTicket({ userId: null, email: "ME@x.com" }, reader), true);
    assert.equal(readerOwnsTicket({ userId: null, email: "me@x.com" }, { ...reader, emailVerified: false }), false);
    assert.equal(readerOwnsTicket({ userId: "u2", email: "other@x.com" }, reader), false);
    assert.equal(readerOwnsTicket({ userId: null, email: "" }, { ...reader, email: "" }), false);
  });

  it("never exposes staff-only fields", () => {
    const t = toReaderTicket({
      id: "AJ-2026-111111", ticketNumber: "AJ-2026-111111", name: "Maria", email: "m@x.com", userId: "u1",
      topic: "General question", subject: "", status: "waiting", createdAt: "a", updatedAt: "b",
      lastMessageAt: "c", lastMessagePreview: "p", messageCount: 2, unreadForStaff: true, closedAt: null,
    });
    assert.deepEqual(Object.keys(t).sort(), ["createdAt", "status", "subject", "ticketNumber", "topic", "updatedAt"]);
    assert.equal(t.subject, "General question");
    assert.equal(t.updatedAt, "c");
    const m = toReaderMessage({ id: "m1", direction: "staff", channel: "cms", authorName: null, body: "Hi", createdAt: "d", emailStatus: "failed", providerMessageId: "x" });
    assert.deepEqual(Object.keys(m).sort(), ["authorName", "body", "createdAt", "fromReader", "id"]);
    assert.equal(m.authorName, "Alex");
    assert.equal(toReaderMessage({ id: "m2", direction: "customer", channel: "site", authorName: "Maria", body: "x", createdAt: "e" }).authorName, null);
  });

  it("sorts newest first and validates replies", () => {
    const rows = sortByLatest([
      { lastMessageAt: "2026-01-01", updatedAt: "" },
      { lastMessageAt: "2026-03-01", updatedAt: "" },
    ]);
    assert.equal(rows[0].lastMessageAt, "2026-03-01");
    assert.equal(validateReaderReply(" ").ok, false);
    assert.equal(validateReaderReply("x".repeat(6000)).ok, false);
    assert.deepEqual(validateReaderReply("  Thanks!  "), { ok: true, body: "Thanks!" });
  });
});

describe("quick answers", () => {
  it("keeps valid items and site-only links", () => {
    const qa = parseQuickAnswers({
      items: [
        { question: "Q1", answer: "A1", linkLabel: "Go", linkHref: "/account#help" },
        { question: "Q2", answer: "A2", linkLabel: "Bad", linkHref: "https://evil.example" },
        { question: "", answer: "no question" },
        "junk",
      ],
    });
    assert.equal(qa.title, "Quick answers");
    assert.equal(qa.items.length, 2);
    assert.deepEqual(qa.items[0].link, { label: "Go", href: "/account#help" });
    assert.equal(qa.items[1].link, null);
    assert.equal(isSitePath("//evil.example"), false);
    assert.deepEqual(parseQuickAnswers(undefined).items, []);
  });
});

/* ---------------- signed-in routes ---------------- */

let session = null;
let profile = null;
let limitedOk = true;
let stored = [];
let staffAlerts = [];

class FakeResponse extends Response {
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers || {}) },
    });
  }
}

const mine = {
  id: "AJ-2026-111111", ticketNumber: "AJ-2026-111111", name: "Maria", email: "maria@example.com", userId: "u1",
  topic: "General question", subject: "Trip help", status: "waiting", createdAt: "2026-09-20T10:00:00Z",
  updatedAt: "2026-09-21T10:00:00Z", lastMessageAt: "2026-09-21T10:00:00Z", lastMessagePreview: "x",
  messageCount: 2, unreadForStaff: false, closedAt: null,
};
const guestSameEmail = { ...mine, id: "AJ-2026-222222", ticketNumber: "AJ-2026-222222", userId: null, lastMessageAt: "2026-09-22T10:00:00Z" };
const someoneElse = { ...mine, id: "AJ-2026-333333", ticketNumber: "AJ-2026-333333", userId: "u9", email: "other@example.com" };
const all = [mine, guestSameEmail, someoneElse];
const messages = [
  { id: "m1", direction: "customer", channel: "form", authorName: "Maria", body: "Help please", createdAt: "a" },
  { id: "m2", direction: "staff", channel: "cms", authorName: "Alex", body: "Sure", createdAt: "b", emailStatus: "sent" },
];

mock.module("next/server.js", { namedExports: { NextResponse: FakeResponse } });
mock.module("@/auth", { namedExports: { auth: async () => session } });
mock.module("@/lib/firebase-admin", { namedExports: { isFirebaseConfigured: () => true, getFirestoreDb: () => null } });
mock.module("@/lib/users", { namedExports: { getUserById: async () => profile } });
mock.module("@/lib/cms/rate-limit", { namedExports: { rateLimit: async () => ({ ok: limitedOk, retryAfterSec: 60 }) } });
class SupportUnavailableError extends Error {}
mock.module("@/lib/support-store", {
  namedExports: {
    SupportUnavailableError,
    // Mirrors the real queries: by userId, plus by email when one is passed.
    listTicketsForReader: async ({ userId, email }) =>
      all.filter((t) => t.userId === userId || (email && t.email === email)),
    getTicket: async (n) => {
      const t = all.find((x) => x.ticketNumber === n);
      return t ? { ticket: t, messages } : null;
    },
    addCustomerSiteReply: async (n, input) => {
      stored.push([n, input]);
      const t = all.find((x) => x.ticketNumber === n);
      return {
        ticket: { ...t, status: "open", unreadForStaff: true },
        message: { id: "m3", direction: "customer", channel: "site", authorName: input.authorName, body: input.body, createdAt: "c" },
      };
    },
  },
});
mock.module("@/lib/support-notify", {
  namedExports: {
    notifyStaff: async (t, kind, body) => {
      staffAlerts.push([t.ticketNumber, kind, body]);
      return { status: "sent" };
    },
  },
});

const listRoute = await import("../src/app/api/support/my-requests/route.ts");
const detailRoute = await import("../src/app/api/support/my-requests/[ticketNumber]/route.ts");
const replyRoute = await import("../src/app/api/support/my-requests/[ticketNumber]/reply/route.ts");
const ctx = (ticketNumber) => ({ params: Promise.resolve({ ticketNumber }) });
const post = (body) =>
  new Request("https://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  session = { user: { id: "u1", email: "maria@example.com", name: "Maria" } };
  profile = { id: "u1", email: "maria@example.com", name: "Maria", emailVerified: true, disabled: false };
  limitedOk = true;
  stored = [];
  staffAlerts = [];
});

test("signed-out readers get 401 everywhere", async () => {
  session = null;
  assert.equal((await listRoute.GET()).status, 401);
  assert.equal((await detailRoute.GET(new Request("https://x"), ctx(mine.ticketNumber))).status, 401);
  assert.equal((await replyRoute.POST(post({ message: "hi there" }), ctx(mine.ticketNumber))).status, 401);
});

test("list shows own and verified-email requests, newest first, nothing else", async () => {
  const body = await (await listRoute.GET()).json();
  assert.deepEqual(body.requests.map((r) => r.ticketNumber), ["AJ-2026-222222", "AJ-2026-111111"]);
  assert.equal(body.requests[0].status, "waiting");
  assert.equal(JSON.stringify(body).includes("unreadForStaff"), false);
  assert.equal(JSON.stringify(body).includes("maria@example.com"), false);
});

test("unverified email only matches by account", async () => {
  profile = { ...profile, emailVerified: false };
  const body = await (await listRoute.GET()).json();
  assert.deepEqual(body.requests.map((r) => r.ticketNumber), ["AJ-2026-111111"]);
  const res = await detailRoute.GET(new Request("https://x"), ctx(guestSameEmail.ticketNumber));
  assert.equal(res.status, 404);
});

test("detail returns the thread without staff-only fields; others get 404", async () => {
  const res = await detailRoute.GET(new Request("https://x"), ctx(mine.ticketNumber));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.messages.length, 2);
  assert.equal(body.messages[1].fromReader, false);
  assert.equal(JSON.stringify(body).includes("emailStatus"), false);
  assert.equal((await detailRoute.GET(new Request("https://x"), ctx(someoneElse.ticketNumber))).status, 404);
  assert.equal((await detailRoute.GET(new Request("https://x"), ctx("../etc"))).status, 404);
});

test("reply saves, reopens, and alerts support like an email reply", async () => {
  const res = await replyRoute.POST(post({ message: "  Still stuck, thanks!  " }), ctx(mine.ticketNumber));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.request.status, "active");
  assert.equal(body.message.fromReader, true);
  assert.deepEqual(stored[0], [mine.ticketNumber, { body: "Still stuck, thanks!", authorName: "Maria" }]);
  assert.deepEqual(staffAlerts[0], [mine.ticketNumber, "reply", "Still stuck, thanks!"]);
});

test("reply is blocked for other people's requests, empty text, and when rate limited", async () => {
  assert.equal((await replyRoute.POST(post({ message: "hello there" }), ctx(someoneElse.ticketNumber))).status, 404);
  assert.equal((await replyRoute.POST(post({ message: " " }), ctx(mine.ticketNumber))).status, 400);
  limitedOk = false;
  assert.equal((await replyRoute.POST(post({ message: "hello there" }), ctx(mine.ticketNumber))).status, 429);
  assert.equal(stored.length, 0);
  assert.equal(staffAlerts.length, 0);
});
