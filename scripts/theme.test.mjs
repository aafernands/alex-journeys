import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test } from "node:test";
import {
  THEME_INIT_SCRIPT,
  THEME_NIGHT_END_HOUR,
  THEME_NIGHT_START_HOUR,
  isNightHour,
  msUntilThemeBoundary,
  parseStoredTheme,
  readColorScheme,
  resolveThemeDark,
} from "../src/lib/theme.ts";

function scheme(dark, light, queried = true) {
  return { queried, dark, light };
}

test("explicit light and dark win over the device and the clock", () => {
  const night = 22;
  const day = 12;
  const darkDevice = scheme(true, false);
  const lightDevice = scheme(false, true);
  const none = scheme(false, false);
  assert.equal(resolveThemeDark("dark", lightDevice, day), true);
  assert.equal(resolveThemeDark("light", darkDevice, night), false);
  assert.equal(resolveThemeDark("dark", none, day), true);
  assert.equal(resolveThemeDark("light", none, night), false);
});

test("automatic follows a usable device preference", () => {
  assert.equal(resolveThemeDark("system", scheme(true, false), 12), true);
  assert.equal(resolveThemeDark("system", scheme(false, true), 22), false);
  assert.equal(parseStoredTheme(null), "system");
  assert.equal(parseStoredTheme("nope"), "system");
});

test("automatic uses local time only when the device has no preference", () => {
  assert.equal(isNightHour(19), true);
  assert.equal(isNightHour(0), true);
  assert.equal(isNightHour(6), true);
  assert.equal(isNightHour(7), false);
  assert.equal(isNightHour(18), false);
  assert.equal(THEME_NIGHT_START_HOUR, 19);
  assert.equal(THEME_NIGHT_END_HOUR, 7);

  const none = scheme(false, false);
  const missing = scheme(false, false, false);
  for (const hour of [19, 23, 0, 6]) {
    assert.equal(resolveThemeDark("system", none, hour), true, `no-preference ${hour}`);
    assert.equal(resolveThemeDark("system", missing, hour), true, `unsupported ${hour}`);
  }
  for (const hour of [7, 12, 18]) {
    assert.equal(resolveThemeDark("system", none, hour), false, `no-preference ${hour}`);
    assert.equal(resolveThemeDark("system", missing, hour), false, `unsupported ${hour}`);
  }
});

test("color scheme queries tolerate a missing or throwing matchMedia", () => {
  assert.deepEqual(readColorScheme(null), { queried: false, dark: false, light: false });
  assert.deepEqual(
    readColorScheme(() => {
      throw new Error("nope");
    }),
    { queried: false, dark: false, light: false },
  );
  assert.deepEqual(
    readColorScheme((query) => ({ matches: query.includes("dark") })),
    { queried: true, dark: true, light: false },
  );
});

test("the next theme boundary is the following 07:00 or 19:00", () => {
  const morning = msUntilThemeBoundary(new Date(2026, 8, 25, 6, 30, 0));
  assert.equal(morning, 30 * 60 * 1000);
  const afternoon = msUntilThemeBoundary(new Date(2026, 8, 25, 12, 0, 0));
  assert.equal(afternoon, 7 * 60 * 60 * 1000);
  const evening = msUntilThemeBoundary(new Date(2026, 8, 25, 20, 0, 0));
  assert.equal(evening, 11 * 60 * 60 * 1000);
});

function paintWithScript({ stored, matchMedia, hour }) {
  const classes = new Set();
  const fixed = new Date(2026, 8, 25, hour, 15, 0);
  const context = vm.createContext({
    localStorage: {
      getItem(key) {
        return key === "theme" ? stored : null;
      },
    },
    document: {
      documentElement: {
        classList: {
          add(name) {
            classes.add(name);
          },
          remove(name) {
            classes.delete(name);
          },
        },
      },
    },
    window: { matchMedia },
    Date: class extends Date {
      constructor(...args) {
        super();
        if (args.length === 0) return fixed;
        return new Date(...args);
      }
    },
  });
  vm.runInContext(THEME_INIT_SCRIPT, context);
  return classes.has("dark");
}

test("the first-paint script matches resolveThemeDark", () => {
  const cases = [
    { stored: "dark", dark: false, light: true, hour: 12 },
    { stored: "light", dark: true, light: false, hour: 22 },
    { stored: "system", dark: true, light: false, hour: 12 },
    { stored: "system", dark: false, light: true, hour: 22 },
    { stored: null, dark: false, light: false, hour: 21 },
    { stored: null, dark: false, light: false, hour: 10 },
    { stored: "system", dark: false, light: false, hour: 6 },
    { stored: "system", dark: false, light: false, hour: 7 },
  ];
  for (const item of cases) {
    const matchMedia = (query) => ({ matches: query.includes("dark") ? item.dark : item.light });
    const painted = paintWithScript({ stored: item.stored, matchMedia, hour: item.hour });
    const expected = resolveThemeDark(
      parseStoredTheme(item.stored),
      readColorScheme(matchMedia),
      item.hour,
    );
    assert.equal(painted, expected, JSON.stringify(item));
  }

  const unsupported = paintWithScript({
    stored: null,
    matchMedia: undefined,
    hour: 23,
  });
  assert.equal(unsupported, true);

  const throwing = paintWithScript({
    stored: "system",
    matchMedia() {
      throw new Error("unsupported");
    },
    hour: 15,
  });
  assert.equal(throwing, false);
});

test("appearance and install live in account settings, not the drawer", () => {
  const drawer = readFileSync(
    new URL("../src/components/header/MobileNavDrawer.tsx", import.meta.url),
    "utf8",
  );
  const account = readFileSync(
    new URL("../src/components/account/AccountPreferences.tsx", import.meta.url),
    "utf8",
  );
  const dashboard = readFileSync(
    new URL("../src/components/account/AccountDashboard.tsx", import.meta.url),
    "utf8",
  );
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(drawer, /ThemeAppearance|AddToHomeScreen|Appearance/);
  assert.match(drawer, /aria-label="Sign in"/);
  const install = readFileSync(
    new URL("../src/components/AddToHomeScreenButton.tsx", import.meta.url),
    "utf8",
  );
  assert.match(dashboard, /<AccountPreferences/);
  assert.match(account, /Automatic/);
  assert.match(account, /<AddToHomeScreenButton/);
  assert.match(account, /settings-app/);
  assert.match(install, /Add to home screen/);
  assert.match(install, /installCanBeOffered|installIsAvailable/);
  assert.doesNotMatch(account, /glass/);
  assert.match(layout, /THEME_INIT_SCRIPT/);
  assert.doesNotMatch(THEME_INIT_SCRIPT, /geolocation|getCurrentPosition/);
});
