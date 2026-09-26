import assert from "node:assert/strict";
import test, { mock } from "node:test";

let authAllowed = false;

class FakeResponse extends Response {
  static json(body, init = {}) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers || {}) },
    });
  }
}

mock.module("next/server.js", { namedExports: { NextResponse: FakeResponse } });
mock.module("@/lib/cms/auth", { namedExports: { isCmsAuthenticated: async () => authAllowed } });

const route = await import("../src/app/api/cms/emails/preview/route.ts");

test("email preview is CMS-admin only", async () => {
  authAllowed = false;
  const res = await route.GET(new Request("https://x.test/api/cms/emails/preview?id=verify-email"));
  assert.equal(res.status, 401);
});

test("email preview renders HTML, text and a list", async () => {
  authAllowed = true;
  const html = await route.GET(new Request("https://x.test/api/cms/emails/preview?id=subscription-renewed"));
  assert.equal(html.status, 200);
  assert.match(await html.text(), /Subscription Renewed Successfully/);
  const text = await route.GET(new Request("https://x.test/api/cms/emails/preview?id=payment-failed&format=text"));
  assert.match(await text.text(), /^Subject: /);
  const list = await route.GET(new Request("https://x.test/api/cms/emails/preview"));
  const body = await list.json();
  assert.ok(body.templates.length >= 10);
  const missing = await route.GET(new Request("https://x.test/api/cms/emails/preview?id=nope"));
  assert.equal(missing.status, 404);
});
