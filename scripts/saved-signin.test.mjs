import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  accountReturnPath,
  accountSectionFromLocation,
  SAVED_ACCOUNT_HREF,
  SAVED_SIGN_IN_INTRO,
  SAVED_SIGN_IN_RETURN,
} from "../src/lib/account-section.ts";
import {
  forgetPendingHotelSave,
  forgetPendingPostSave,
  rememberPendingHotelSave,
  rememberPendingPostSave,
  takePendingHotelSave,
  takePendingPostSave,
} from "../src/lib/pending-save.ts";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function memoryStore() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

describe("account section from the address bar", () => {
  it("prefers a section query so OAuth can land on Saved", () => {
    assert.equal(accountSectionFromLocation("", "?section=saved"), "saved");
    assert.equal(accountSectionFromLocation("#overview", "section=trips"), "trips");
    assert.equal(accountSectionFromLocation("#saved", ""), "saved");
    assert.equal(accountSectionFromLocation("#nope", "?section=cms"), "overview");
    assert.equal(accountReturnPath("overview"), "/account");
    assert.equal(accountReturnPath("saved"), SAVED_SIGN_IN_RETURN);
    assert.equal(SAVED_ACCOUNT_HREF, "/account#saved");
  });
});

describe("pending save after the sign-in sheet", () => {
  it("keeps a story save until sign-in finishes, and drops it if the sheet closes", () => {
    const store = memoryStore();
    rememberPendingPostSave("lisbon-notes", store);
    forgetPendingPostSave("other", store);
    assert.equal(takePendingPostSave("lisbon-notes", store), true);
    assert.equal(takePendingPostSave("lisbon-notes", store), false);

    rememberPendingPostSave("lisbon-notes", store);
    forgetPendingPostSave("lisbon-notes", store);
    assert.equal(takePendingPostSave("lisbon-notes", store), false);
  });

  it("keeps a hotel save for the same hotel only", () => {
    const store = memoryStore();
    const hotel = {
      hotelId: "lp1",
      name: "House",
      city: "Lisbon",
      neighborhood: "Alfama",
      photo: "",
      rating: null,
      stars: null,
      destination: "Lisbon",
      startDate: "",
      endDate: "",
      tripId: "",
    };
    rememberPendingHotelSave(hotel, store);
    assert.equal(takePendingHotelSave("other", store), null);
    assert.equal(takePendingHotelSave("lp1", store)?.name, "House");
    assert.equal(takePendingHotelSave("lp1", store), null);

    rememberPendingHotelSave(hotel, store);
    forgetPendingHotelSave("lp1", store);
    assert.equal(takePendingHotelSave("lp1", store), null);
  });
});

describe("logged-out saved entry points", () => {
  it("opens the shared sign-in sheet from Saved instead of navigating away", () => {
    const nav = source("../src/components/header/MobileBottomNav.tsx");
    assert.match(nav, /const \{ focused \} = useTripFocus\(\)/);
    assert.match(nav, /const visible = !focused/);
    assert.match(nav, /openReaderLogin\(\{[\s\S]*returnTo: SAVED_SIGN_IN_RETURN/);
    assert.match(nav, /intro: SAVED_SIGN_IN_INTRO/);
    assert.match(nav, /aria-haspopup="dialog"/);
    assert.match(nav, /if \(signedIn\)/);
    assert.match(nav, /href=\{tab\.href\}/);
    assert.equal(SAVED_SIGN_IN_INTRO, "Sign in to see your saved stories and trips.");
    const prompt = source("../src/components/ReaderLoginPrompt.tsx");
    assert.match(prompt, /<DrawerLoginDialog/);
    assert.doesNotMatch(prompt, /Sign in to continue/);
  });

  it("renders the same sign-in form inline on the logged-out account page", () => {
    const page = source("../src/app/account/page.tsx");
    assert.match(page, /<AccountSignIn/);
    assert.doesNotMatch(page, /Sign in to continue/);
    assert.doesNotMatch(page, /AccountAuthActions/);
    const form = source("../src/components/account/AccountSignIn.tsx");
    assert.match(form, /<ReaderLoginForm/);
    assert.match(form, /titleLevel="h2"/);
    assert.match(form, /Plan a trip/);
    assert.match(form, /Browse stories/);
    assert.match(form, /accountReturnPath/);
  });

  it("uses the sheet for story and hotel saves, and keeps the drawer on the same sheet", () => {
    const post = source("../src/components/SavePostButton.tsx");
    const hotel = source("../src/components/stays/SaveHotelButton.tsx");
    const drawer = source("../src/components/header/MobileNavDrawer.tsx");
    const header = source("../src/components/Header.tsx");
    assert.match(post, /openReaderLogin/);
    assert.match(post, /Sign in to save this story\./);
    assert.doesNotMatch(post, /window\.location\.href = `\/login/);
    assert.match(hotel, /openReaderLogin/);
    assert.match(hotel, /Sign in to save this hotel\./);
    assert.doesNotMatch(hotel, /window\.location\.href = `\/login/);
    assert.match(drawer, /openReaderLogin\(\{ onAuthenticated: onClose \}\)/);
    assert.doesNotMatch(drawer, /<DrawerLoginDialog/);
    assert.doesNotMatch(header, /variant="header-mobile"/);
  });
});
