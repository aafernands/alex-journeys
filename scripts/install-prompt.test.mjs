import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  INSTALL_CAPTURE_SCRIPT,
  INSTALL_DISMISS_MS,
  buildInstallGuide,
  INSTALL_PROMPT_DELAY_MS,
  dismissUntilValue,
  installAutoPromptDelayMs,
  installButtonLabel,
  installCanBeOffered,
  installInstructions,
  installVisibility,
  isInstallPromptPage,
  isStandaloneDisplay,
} from "../src/lib/install-prompt.ts";
import manifest from "../src/app/manifest.ts";

test("installation invitation stays out of account, CMS, checkout and booking flows", () => {
  for (const path of [
    "/cms",
    "/cms/trip-planner",
    "/account",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/stays/123/checkout",
    "/flights/confirmation",
    "/flights/book",
    "/stays/confirmation",
  ]) {
    assert.equal(isInstallPromptPage(path), false, path);
  }
  assert.equal(isInstallPromptPage("/"), true);
  assert.equal(isInstallPromptPage("/guides/plan-a-trip"), true);
  assert.equal(isInstallPromptPage("/flights"), true);
  assert.equal(isInstallPromptPage("/stays"), true);
  assert.equal(isInstallPromptPage("/stays/hotel-1"), true);
});

test("an open trip waits for a gesture before the install prompt", () => {
  assert.equal(installAutoPromptDelayMs(true, false), null);
  assert.equal(installAutoPromptDelayMs(true, true), INSTALL_PROMPT_DELAY_MS);
  assert.equal(installAutoPromptDelayMs(false, false), INSTALL_PROMPT_DELAY_MS);
});

test("manual installation instructions match phone, tablet and desktop", () => {
  assert.match(installInstructions("iPhone", 5), /Share.*Add to Home Screen/);
  assert.match(installInstructions("Macintosh", 5), /Share.*Add to Home Screen/);
  assert.match(installInstructions("Android", 5), /browser menu/);
  assert.match(installInstructions("Macintosh", 0), /Add to Dock/);
});

test("iOS guide follows the Share button and sends in-app browsers to Safari", () => {
  const iphone = buildInstallGuide(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    5,
  );
  assert.equal(iphone.native, false);
  assert.equal(iphone.sharePlacement, "bottom-bar");
  assert.match(iphone.steps[0].detail, /bottom of Safari/);
  assert.equal(iphone.steps[1].title, "Add to Home Screen");
  assert.equal(iphone.steps[2].title, "Tap Add");

  const ipad = buildInstallGuide(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    5,
  );
  assert.equal(ipad.sharePlacement, "top-bar");
  assert.match(ipad.steps[0].detail, /top of Safari/);

  const chromeIos = buildInstallGuide(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1",
    5,
  );
  assert.equal(chromeIos.sharePlacement, "menu");
  assert.match(chromeIos.steps[0].detail, /Chrome menu/);
  assert.equal(chromeIos.native, false);

  const instagram = buildInstallGuide(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.0.0",
    5,
  );
  assert.equal(instagram.inAppName, "Instagram");
  assert.match(instagram.inAppMessage ?? "", /Safari/);
  assert.equal(instagram.steps.length, 3);
});

test("home screen offer stays hidden when the browser has no install path", () => {
  const chrome = buildInstallGuide(
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
    5,
  );
  assert.equal(installCanBeOffered(chrome), true);

  const iphone = buildInstallGuide(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    5,
  );
  assert.equal(installCanBeOffered(iphone), true);

  const firefox = buildInstallGuide(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
    0,
  );
  assert.equal(installCanBeOffered(firefox), false);
  assert.equal(firefox.native, false);
});

test("Chromium can open the native dialog and the button label matches the device", () => {
  const chrome = buildInstallGuide(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    0,
  );
  assert.equal(chrome.native, true);
  assert.equal(chrome.steps.length, 0);
  assert.equal(installButtonLabel("Mozilla/5.0 (Windows NT 10.0) Chrome/128.0.0.0"), "Install");

  const edge = buildInstallGuide(
    "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
    0,
  );
  assert.equal(edge.native, true);

  const samsung = buildInstallGuide(
    "Mozilla/5.0 (Linux; Android 14; SAMSUNG) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
    5,
  );
  assert.equal(samsung.native, true);
  assert.equal(
    installButtonLabel(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36",
    ),
    "Add to home screen",
  );

  const firefox = buildInstallGuide(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
    0,
  );
  assert.equal(firefox.native, false);
});

test("Not now lasts 14 days and installed stays hidden", () => {
  const now = Date.parse("2026-09-25T00:00:00Z");
  assert.equal(installVisibility({ installed: null, dismissUntil: null }, now), "eligible");
  assert.equal(installVisibility({ installed: "1", dismissUntil: null }, now), "installed");
  const until = Number(dismissUntilValue(now));
  assert.equal(until - now, INSTALL_DISMISS_MS);
  assert.equal(INSTALL_DISMISS_MS, 14 * 24 * 60 * 60 * 1000);
  assert.equal(installVisibility({ installed: null, dismissUntil: String(until) }, now + 1000), "snoozed");
  assert.equal(installVisibility({ installed: null, dismissUntil: String(until) }, until + 1), "eligible");
  assert.equal(isStandaloneDisplay(true, undefined), true);
  assert.equal(isStandaloneDisplay(false, true), true);
  assert.equal(isStandaloneDisplay(false, false), false);
});

test("capture script stashes beforeinstallprompt and does not call prompt on load", () => {
  assert.match(INSTALL_CAPTURE_SCRIPT, /beforeinstallprompt/);
  assert.match(INSTALL_CAPTURE_SCRIPT, /preventDefault/);
  assert.match(INSTALL_CAPTURE_SCRIPT, /appinstalled/);
  assert.doesNotMatch(INSTALL_CAPTURE_SCRIPT, /\.prompt\s*\(/);
});

test("installed shortcut has stable identity, brand colors and maskable icons", () => {
  const app = manifest();
  assert.equal(app.name, "Alex Journeys");
  assert.equal(app.short_name, "Alex Journeys");
  assert.equal(app.id, "/");
  assert.equal(app.start_url, "/");
  assert.equal(app.scope, "/");
  assert.equal(app.display, "standalone");
  assert.equal(app.background_color, "#f6f0e6");
  assert.equal(app.theme_color, "#f6f0e6");
  assert.equal(app.prefer_related_applications, false);
  for (const [size, purpose] of [
    ["192x192", "any"],
    ["512x512", "any"],
    ["192x192", "maskable"],
    ["512x512", "maskable"],
  ]) {
    assert.ok(
      app.icons?.some((icon) => icon.sizes === size && icon.purpose === purpose),
      `${size} ${purpose}`,
    );
  }
  for (const icon of app.icons ?? []) {
    const file = new URL(`../public${icon.src}`, import.meta.url);
    assert.equal(existsSync(file), true, icon.src);
    const bytes = readFileSync(file);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const expected = Number(icon.sizes?.split("x")[0]);
    assert.equal(width, expected, icon.src);
    assert.equal(height, expected, icon.src);
  }
  const apple = readFileSync(new URL("../public/icons/apple-touch-icon.png", import.meta.url));
  assert.equal(apple.readUInt32BE(16), 180);
  assert.equal(apple.readUInt32BE(20), 180);
});

test("service worker stays off the cache and off API routes", () => {
  const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(source, /addEventListener\(\s*["']fetch["']/);
  assert.match(source, /respondWith/);
  assert.match(source, /\/api\//);
  assert.doesNotMatch(source, /caches\.(open|put|add|addAll|match)/);
});
