import assert from "node:assert/strict";
import { test } from "node:test";
import { installInstructions, isInstallPromptPage } from "../src/lib/install-prompt.ts";
import manifest from "../src/app/manifest.ts";

test("installation invitation stays out of account, CMS and checkout flows", () => {
  for (const path of ["/cms", "/cms/trip-planner", "/account", "/login", "/signup", "/forgot-password", "/reset-password", "/stays/123/checkout", "/flights/confirmation"]) {
    assert.equal(isInstallPromptPage(path), false, path);
  }
  assert.equal(isInstallPromptPage("/"), true);
  assert.equal(isInstallPromptPage("/guides/plan-a-trip"), true);
});

test("manual installation instructions match phone, tablet and desktop", () => {
  assert.match(installInstructions("iPhone", 5), /Share.*Add to Home Screen/);
  assert.match(installInstructions("Macintosh", 5), /Share.*Add to Home Screen/);
  assert.match(installInstructions("Android", 5), /browser menu/);
  assert.match(installInstructions("Macintosh", 0), /Add to Dock/);
});

test("installed shortcut has stable identity, branding and standalone launch", () => {
  const app = manifest();
  assert.equal(app.name, "Alex Journeys");
  assert.equal(app.id, "/");
  assert.equal(app.display, "standalone");
  assert.equal(app.icons[0].src, "/brand/favicon.png");
});
