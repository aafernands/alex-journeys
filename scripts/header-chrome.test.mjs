import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("header chrome", () => {
  it("keeps Sign in out of the sticky mobile bar and grows the logo", () => {
    const header = source("../src/components/Header.tsx");
    assert.doesNotMatch(header, /variant="header-mobile"/);
    assert.match(header, /h-\[2\.8125rem\]/);
    assert.match(header, /sm:h-\[3\.75rem\]/);
    assert.match(header, /lg:h-16/);
    assert.match(header, /xl:h-24/);
    assert.match(header, /min-width: 1280px/);
    assert.match(header, /xl:flex/);
    assert.match(header, /xl:hidden/);
    assert.doesNotMatch(header, /md:flex/);
    const drawer = source("../src/components/header/MobileNavDrawer.tsx");
    assert.match(drawer, /variant="drawer-cta"/);
    assert.match(drawer, /variant="drawer"/);
    assert.match(drawer, /mobile-drawer-search/);
    assert.match(drawer, /<BrandLogo/);
    assert.match(drawer, /applyScale=\{false\}/);
    assert.match(drawer, /max-w-\[4\.75rem\]/);
    assert.match(drawer, /pl-0/);
    assert.match(drawer, /inset-0 flex w-full/);
    assert.match(drawer, /xl:hidden/);
    const bottomNav = source("../src/components/header/MobileBottomNav.tsx");
    assert.match(bottomNav, /xl:hidden/);
    assert.doesNotMatch(bottomNav, /md:hidden/);
  });

  it("uses a smaller desktop avatar", () => {
    const menu = source("../src/components/UserMenu.tsx");
    assert.match(
      menu,
      /const avatarBox = isDrawer \? "h-10 w-10 text-sm" : "h-8 w-8 text-xs"/,
    );
    assert.match(menu, /const avatarPx = isDrawer \? 40 : 32/);
    assert.doesNotMatch(menu, /h-11 w-11/);
  });
});
