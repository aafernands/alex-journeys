import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  ga4InlineSnippet,
  ga4ScriptSrc,
  getGaMeasurementId,
  getGoogleSiteVerification,
  isAnalyticsEnabled,
} from "../src/lib/analytics.ts";

const originalWarn = console.warn;

afterEach(() => {
  console.warn = originalWarn;
});

describe("getGaMeasurementId", () => {
  it("returns undefined when both vars are unset", () => {
    assert.equal(getGaMeasurementId({}), undefined);
  });

  it("returns undefined for empty / whitespace values", () => {
    assert.equal(
      getGaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "   " }),
      undefined,
    );
    assert.equal(getGaMeasurementId({ NEXT_PUBLIC_GA_ID: "" }), undefined);
  });

  it("reads NEXT_PUBLIC_GA_MEASUREMENT_ID", () => {
    assert.equal(
      getGaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TESTID" }),
      "G-TESTID",
    );
  });

  it("accepts NEXT_PUBLIC_GA_ID as an alias", () => {
    assert.equal(
      getGaMeasurementId({ NEXT_PUBLIC_GA_ID: "G-ALIAS01" }),
      "G-ALIAS01",
    );
  });

  it("prefers MEASUREMENT_ID over the alias", () => {
    assert.equal(
      getGaMeasurementId({
        NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-PRIMARY1",
        NEXT_PUBLIC_GA_ID: "G-ALIAS01",
      }),
      "G-PRIMARY1",
    );
  });

  it("rejects values that are not GA4 G- ids (no script injection)", () => {
    const warnings = [];
    console.warn = (msg) => {
      warnings.push(String(msg));
    };

    assert.equal(
      getGaMeasurementId({
        NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-XX';alert(1)//",
      }),
      undefined,
    );
    assert.equal(
      getGaMeasurementId({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-123" }),
      undefined,
    );
    assert.ok(warnings.length >= 2);
  });
});

describe("isAnalyticsEnabled", () => {
  it("is false when unset and true when a valid id is set", () => {
    assert.equal(isAnalyticsEnabled({}), false);
    assert.equal(
      isAnalyticsEnabled({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TESTID" }),
      true,
    );
  });
});

describe("getGoogleSiteVerification", () => {
  it("returns undefined when unset/empty", () => {
    assert.equal(getGoogleSiteVerification({}), undefined);
    assert.equal(
      getGoogleSiteVerification({ NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: "  " }),
      undefined,
    );
  });

  it("returns the trimmed token when set", () => {
    assert.equal(
      getGoogleSiteVerification({
        NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: " abc123 ",
      }),
      "abc123",
    );
  });
});

describe("ga4 script helpers", () => {
  it("builds the gtag.js URL and config snippet for G-TESTID", () => {
    const id = "G-TESTID";
    assert.equal(
      ga4ScriptSrc(id),
      "https://www.googletagmanager.com/gtag/js?id=G-TESTID",
    );
    const snippet = ga4InlineSnippet(id);
    assert.match(snippet, /gtag\('config', "G-TESTID"\)/);
    assert.match(snippet, /window\.dataLayer/);
  });
});
