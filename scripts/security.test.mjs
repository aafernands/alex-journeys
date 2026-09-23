import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeCmsHtml } from "../src/lib/cms/sanitize-html.ts";
import {
  cookieOptions,
  createSessionToken,
  verifyPasscode,
  verifySessionToken,
} from "../src/lib/cms/passcode.ts";

test("CMS HTML removes executable content and preserves article markup", () => {
  const html = sanitizeCmsHtml(
    '<h2>Heading</h2><p><strong>Safe</strong> copy</p>' +
      '<script>alert(1)</script>' +
      '<img src="https://example.com/photo.jpg" alt="Photo" onerror="alert(1)">' +
      '<a href="javascript:alert(1)" target="_blank">Bad link</a>' +
      '<a href="https://example.com" target="_blank">Good link</a>',
  );

  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<strong>Safe<\/strong>/);
  assert.doesNotMatch(html, /<script|onerror|javascript:/i);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("CMS passcode sessions are signed and expire", () => {
  const previous = process.env.CMS_PASSCODE;
  process.env.CMS_PASSCODE = "phase-one-test-passcode";
  try {
    const token = createSessionToken();
    assert.ok(token);
    assert.equal(verifyPasscode("phase-one-test-passcode"), true);
    assert.equal(verifyPasscode("wrong-passcode"), false);
    assert.equal(verifySessionToken(token), true);
    assert.equal(verifySessionToken(`${token}tampered`), false);
    assert.equal(cookieOptions().httpOnly, true);
    assert.equal(cookieOptions().sameSite, "lax");
    assert.equal(cookieOptions().maxAge > 0, true);
  } finally {
    if (previous === undefined) delete process.env.CMS_PASSCODE;
    else process.env.CMS_PASSCODE = previous;
  }
});