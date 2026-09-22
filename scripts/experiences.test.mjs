import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getViatorExperiencesConfig } from "../src/lib/experiences-config.ts";
import {
  EXPERIENCES_CAMPAIGN,
  buildExperiencesWidget,
  cleanDestination,
  experiencesPath,
  parseExperiencesSearchParams,
  viatorExperiencesSearchUrl,
} from "../src/lib/experiences.ts";
import { VIATOR_PARTNER_ID } from "../src/lib/viator.ts";

const REF = "W-d221060c-7906-45a8-891a-f3c2bf6f5146";

const settings = {
  partnerId: VIATOR_PARTNER_ID,
  widgetRef: "",
  campaign: EXPERIENCES_CAMPAIGN,
  language: "en",
  currency: "USD",
};

describe("experiences page", () => {
  const previousRef = process.env.VIATOR_DYNAMIC_WIDGET_REF;
  const previousPartner = process.env.VIATOR_PARTNER_ID;

  afterEach(() => {
    if (previousRef === undefined) delete process.env.VIATOR_DYNAMIC_WIDGET_REF;
    else process.env.VIATOR_DYNAMIC_WIDGET_REF = previousRef;
    if (previousPartner === undefined) delete process.env.VIATOR_PARTNER_ID;
    else process.env.VIATOR_PARTNER_ID = previousPartner;
  });

  it("builds a destination path and drops a broken date range", () => {
    assert.equal(experiencesPath({}), "/experiences");
    assert.equal(
      experiencesPath({
        destination: "  Paris  ",
        startDate: "2027-06-02",
        endDate: "2027-06-09",
        adults: 2,
        children: 0,
      }),
      "/experiences?dest=Paris&start=2027-06-02&end=2027-06-09&adults=2",
    );
    assert.equal(
      experiencesPath({
        destination: "Tokyo",
        startDate: "2027-06-09",
        endDate: "2027-06-02",
        adults: "2",
        children: "1",
      }),
      "/experiences?dest=Tokyo&start=2027-06-09&adults=2&children=1",
    );
    assert.equal(cleanDestination("A".repeat(120)).length, 80);
  });

  it("reads dest plus optional dates and travelers", () => {
    assert.deepEqual(
      parseExperiencesSearchParams({
        dest: "Paris",
        start: "2027-06-02",
        end: "2027-06-09",
        adults: "2",
        children: "1",
      }),
      {
        destination: "Paris",
        startDate: "2027-06-02",
        endDate: "2027-06-09",
        adults: 2,
        children: 1,
      },
    );
    assert.equal(
      parseExperiencesSearchParams({ destination: ["Lisbon"] }).destination,
      "Lisbon",
    );
    assert.equal(
      parseExperiencesSearchParams({ travelers: "3" }).adults,
      3,
    );
  });

  it("renders one dynamic widget for the destination and escapes the search term", () => {
    const pending = buildExperiencesWidget(
      {
        destination: 'Paris "night"',
        startDate: "2027-06-02",
        endDate: "2027-06-09",
        adults: 2,
        children: 1,
      },
      settings,
    );
    assert.match(pending, new RegExp(`data-vi-partner-id="${VIATOR_PARTNER_ID}"`));
    assert.match(pending, /data-vi-search-term="Paris &quot;night&quot;"/);
    assert.match(pending, /data-vi-campaign="plan-experiences"/);
    assert.match(pending, /data-vi-travel-date-from="2027-06-02"/);
    assert.match(pending, /data-vi-travellers-adults="2"/);
    assert.match(pending, /data-vi-travellers-children="1"/);
    assert.equal(pending.includes("data-vi-widget-ref"), false);
    assert.equal(pending.includes("<script"), false);

    const ready = buildExperiencesWidget(
      {
        destination: "Paris",
        startDate: "",
        endDate: "",
        adults: null,
        children: null,
      },
      { ...settings, widgetRef: REF },
    );
    assert.match(ready, new RegExp(`data-vi-widget-ref="${REF}"`));
    assert.match(ready, /data-vi-search-term="Paris"/);
  });

  it("keeps the Viator search link on the existing partner ids", () => {
    const url = new URL(viatorExperiencesSearchUrl("Lisbon, Portugal"));
    assert.equal(url.hostname, "www.viator.com");
    assert.equal(url.searchParams.get("pid"), VIATOR_PARTNER_ID);
    assert.equal(url.searchParams.get("mcid"), "42383");
    assert.equal(url.searchParams.get("campaign"), EXPERIENCES_CAMPAIGN);
    assert.equal(url.searchParams.get("text"), "Lisbon, Portugal");
  });

  it("ships without a widget ref until the dashboard id is pasted", () => {
    delete process.env.VIATOR_DYNAMIC_WIDGET_REF;
    delete process.env.VIATOR_PARTNER_ID;
    const config = getViatorExperiencesConfig();
    assert.equal(config.partnerId, VIATOR_PARTNER_ID);
    assert.equal(config.widgetRef, "");
    assert.equal(config.widgetReady, false);
    assert.equal(config.campaign, EXPERIENCES_CAMPAIGN);

    process.env.VIATOR_DYNAMIC_WIDGET_REF = REF;
    process.env.VIATOR_PARTNER_ID = "not-a-partner";
    const overridden = getViatorExperiencesConfig();
    assert.equal(overridden.widgetRef, REF);
    assert.equal(overridden.widgetReady, true);
    assert.equal(overridden.partnerId, VIATOR_PARTNER_ID);

    process.env.VIATOR_PARTNER_ID = "P00999999";
    assert.equal(getViatorExperiencesConfig().partnerId, "P00999999");
  });
});
