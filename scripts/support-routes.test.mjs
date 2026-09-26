import assert from "node:assert/strict";
import { beforeEach, test, mock } from "node:test";

let authAllowed = false;
let created = [];
let notified = [];
let replies = [];

class FakeResponse extends Response {
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers || {}) },
    });
  }
}

mock.module("next/server.js", { namedExports: { NextResponse: FakeResponse } });
mock.module("@/lib/cms/auth", {
  namedExports: { isCmsAuthenticated: async () => authAllowed, getCmsSession: async () => ({ user: { name: "Alex Fernandes" } }) },
});
mock.module("@/auth", { namedExports: { auth: async () => null } });
mock.module("@/lib/cms/rate-limit", { namedExports: { rateLimit: async () => ({ ok: true, retryAfterSec: 0 }) } });
mock.module("@/lib/turnstile", {
  namedExports: { clientIpFromRequest: () => "1.2.3.4", verifyTurnstileToken: async () => ({ ok: true }) },
});
class SupportUnavailableError extends Error {}
const baseTicket = {
  id: "AJ-2026-111111",
  ticketNumber: "AJ-2026-111111",
  name: "Maria",
  email: "maria@example.com",
  userId: null,
  topic: "General question",
  subject: "Hello",
  status: "open",
  createdAt: "2026-09-26T12:00:00Z",
  updatedAt: "2026-09-26T12:00:00Z",
  lastMessageAt: "2026-09-26T12:00:00Z",
  lastMessagePreview: "Hi",
  messageCount: 1,
  unreadForStaff: true,
  closedAt: null,
};
mock.module("@/lib/support-store", {
  namedExports: {
    SupportUnavailableError,
    createTicket: async (input) => {
      created.push(input);
      return { ticket: { ...baseTicket, ...input }, message: {} };
    },
    listTickets: async () => [baseTicket],
    getTicket: async (n) => (n === baseTicket.ticketNumber ? { ticket: baseTicket, messages: [] } : null),
    markTicketRead: async () => {},
    setTicketStatus: async (n, status) => ({ ...baseTicket, status }),
    addStaffReply: async (n, input) => {
      replies.push(input);
      return { ticket: { ...baseTicket, status: input.close ? "closed" : "waiting" }, messageId: "m1" };
    },
    setMessageEmailStatus: async () => {},
  },
});
mock.module("@/lib/support-notify", {
  namedExports: {
    notifyTicketCreated: async (t) => {
      notified.push(["created", t.ticketNumber]);
      return { customer: { status: "sent" }, staff: { status: "sent" } };
    },
    notifyStaffReply: async (t) => {
      notified.push(["reply", t.status]);
      return { status: "sent" };
    },
    notifyTicketClosed: async () => {
      notified.push(["closed"]);
      return { status: "sent" };
    },
  },
});

const publicRoute = await import("../src/app/api/support/tickets/route.ts");
const listRoute = await import("../src/app/api/cms/support/route.ts");
const ticketRoute = await import("../src/app/api/cms/support/[id]/route.ts");
const replyRoute = await import("../src/app/api/cms/support/[id]/reply/route.ts");

function post(url, body) {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
const ctx = (id) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  created = [];
  notified = [];
  replies = [];
  authAllowed = false;
});

test("guest can open a ticket and gets a reference number", async () => {
  const res = await publicRoute.POST(post("https://x/api/support/tickets", { name: "Maria", email: "maria@example.com", message: "Hello, I need help with my trip." }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ticketNumber, "AJ-2026-111111");
  assert.equal(created[0].userId, null);
  assert.deepEqual(notified[0], ["created", "AJ-2026-111111"]);
});

test("honeypot and bad input", async () => {
  const bot = await publicRoute.POST(post("https://x/api/support/tickets", { name: "B", email: "b@b.co", message: "spam spam spam", website: "http://spam" }));
  assert.equal(bot.status, 200);
  assert.equal(created.length, 0);
  const bad = await publicRoute.POST(post("https://x/api/support/tickets", { name: "B", email: "nope", message: "Hello there friend" }));
  assert.equal(bad.status, 400);
});

test("CMS support APIs require a CMS admin", async () => {
  assert.equal((await listRoute.GET(new Request("https://x/api/cms/support"))).status, 401);
  assert.equal((await ticketRoute.GET(new Request("https://x"), ctx("AJ-2026-111111"))).status, 401);
  assert.equal((await ticketRoute.PATCH(post("https://x", { status: "closed" }), ctx("AJ-2026-111111"))).status, 401);
  assert.equal((await replyRoute.POST(post("https://x", { body: "hi" }), ctx("AJ-2026-111111"))).status, 401);
});

test("admin can list, reply, and close", async () => {
  authAllowed = true;
  const list = await listRoute.GET(new Request("https://x/api/cms/support?status=all"));
  assert.equal((await list.json()).tickets.length, 1);
  const reply = await replyRoute.POST(post("https://x", { body: "Here you go", close: true }), ctx("AJ-2026-111111"));
  assert.equal(reply.status, 200);
  assert.equal(replies[0].authorName, "Alex");
  assert.deepEqual(notified.at(-1), ["reply", "closed"]);
  const close = await ticketRoute.PATCH(post("https://x", { status: "closed", notify: true }), ctx("AJ-2026-111111"));
  assert.equal((await close.json()).emailStatus, "sent");
  const bad = await ticketRoute.PATCH(post("https://x", { status: "nope" }), ctx("AJ-2026-111111"));
  assert.equal(bad.status, 400);
  const missing = await ticketRoute.GET(new Request("https://x"), ctx("../etc"));
  assert.equal(missing.status, 404);
  const empty = await replyRoute.POST(post("https://x", { body: "  " }), ctx("AJ-2026-111111"));
  assert.equal(empty.status, 400);
});
