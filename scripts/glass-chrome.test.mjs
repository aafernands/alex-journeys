import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("warm glass chrome", () => {
  const css = source("../src/app/globals.css");

  it("defines reusable glass utilities and solid fallbacks", () => {
    assert.match(css, /\.glass,\s*\n\.glass-strong \{/);
    assert.match(css, /-webkit-backdrop-filter: blur\(var\(--glass-blur\)\)/);
    assert.match(css, /backdrop-filter: blur\(var\(--glass-blur\)\)/);
    assert.match(css, /@supports not \(backdrop-filter: blur\(1px\)\)/);
    assert.match(css, /@media \(prefers-reduced-transparency: reduce\)/);
    assert.match(css, /--glass-fill: rgb\(246 240 230 \/ 0\.66\)/);
    assert.match(css, /background: var\(--glass-fallback\)/);
  });

  it("keeps primary actions solid orange", () => {
    assert.match(css, /\.btn-primary \{\s*background: var\(--accent\)/);
    assert.doesNotMatch(css, /\.btn-primary \{[^}]*backdrop-filter/);
    assert.match(css, /\.plan-entry-dialog \{[^}]*background: var\(--white\)/);
  });

  it("puts glass on floating chrome and lets the trip photo pass under the header", () => {
    const header = source("../src/components/Header.tsx");
    const nav = source("../src/components/header/MobileBottomNav.tsx");
    const hub = source("../src/components/trip-planner/ItineraryHub.tsx");
    const drawer = source("../src/components/header/MobileNavDrawer.tsx");
    assert.match(header, /site-header glass/);
    assert.match(nav, /mobile-bottom-nav\b[\s\S]*\bglass\b/);
    assert.match(nav, /app-tab-bar/);
    assert.match(hub, /plan-hero-back glass-strong/);
    assert.match(hub, /plan-hero-action glass-strong/);
    assert.match(drawer, /mobile-nav-panel glass-strong/);
    const dialog = source("../src/components/header/DrawerLoginDialog.tsx");
    assert.match(dialog, /drawer-login-dialog glass-strong/);
    assert.match(css, /\.drawer-login-dialog > \.panel \{[^}]*background: transparent/);
    assert.match(css, /main\.plan-flow:has\(\.plan-workspace\) \{\s*margin-top: calc\(-1 \* \(var\(--site-header-bar\) \+ 1px\)\)/);
    assert.match(css, /\.plan-workspace-tabs \{[\s\S]*position: fixed;/);
    assert.match(css, /@media \(max-width: 639px\) \{[\s\S]*\.plan-sticky,[\s\S]*background: var\(--glass-fill\)/);
    assert.match(css, /\.plan-trip-hotel \.plan-control:not\(\.glass-strong\) \{\s*background: var\(--white\)/);
  });
});
