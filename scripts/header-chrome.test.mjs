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
    assert.match(header, /md:h-20/);
    assert.match(header, /md:h-24/);
    const drawer = source("../src/components/header/MobileNavDrawer.tsx");
    assert.match(drawer, /variant="drawer-cta"/);
    assert.match(drawer, /variant="drawer"/);
    assert.match(drawer, /mobile-drawer-search/);
    assert.match(drawer, /drawerLogoOnLight/);
    assert.match(drawer, /drawerLogoOnDark/);
    assert.match(drawer, /dark:hidden/);
    assert.match(drawer, /dark:block/);
    assert.match(drawer, /w-\\[4\\.75rem\\]/);
    assert.match(drawer, /pl-0/);
    assert.match(drawer, /inset-0 flex w-full/);
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
