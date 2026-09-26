import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  awaitingTrialPaymentMethod,
  cleanPremiumEmail,
  membershipFromSubscription,
} from "../src/lib/membership.ts";
import {
  isStripeSubscriptionId,
  parseJoinDetails,
  parsePremiumPlan,
  premiumJoinHref,
  premiumPublishableKey,
  validateJoinEmail,
  validateJoinName,
} from "../src/lib/premium-join.ts";
import { isFocusedTripChrome, TRIP_FOCUS_BOOT } from "../src/lib/trip-focus.ts";

const IDS = { monthly: "price_month", yearly: "price_year" };

describe("premium join helpers", () => {
  it("parses plans and builds the join link", () => {
    assert.equal(parsePremiumPlan("monthly"), "monthly");
    assert.equal(parsePremiumPlan("weekly"), "yearly");
    assert.equal(premiumJoinHref("monthly"), "/premium/join?plan=monthly");
  });

  it("only uses a Premium publishable key in the same mode as the secret", () => {
    assert.equal(premiumPublishableKey({}), null);
    assert.equal(
      premiumPublishableKey({ STRIPE_PUBLISHABLE_KEY: "pk_test_abcdefghijkl" }),
      null,
      "never reuses the flights (Nuitee) key",
    );
    assert.equal(
      premiumPublishableKey({
        STRIPE_SECRET_KEY: "sk_test_x",
        NEXT_PUBLIC_STRIPE_PREMIUM_PUBLISHABLE_KEY: "pk_test_abcdefghijkl",
      }),
      "pk_test_abcdefghijkl",
    );
    assert.equal(
      premiumPublishableKey({
        STRIPE_SECRET_KEY: "sk_live_x",
        NEXT_PUBLIC_STRIPE_PREMIUM_PUBLISHABLE_KEY: "pk_test_abcdefghijkl",
      }),
      null,
    );
    assert.equal(
      premiumPublishableKey({ NEXT_PUBLIC_STRIPE_PREMIUM_PUBLISHABLE_KEY: "sk_test_abcdefghijkl" }),
      null,
    );
  });

  it("validates email and confirmation", () => {
    assert.deepEqual(validateJoinEmail("a@b.co", "A@B.co "), {});
    assert.ok(validateJoinEmail("nope", "nope").email);
    assert.ok(validateJoinEmail("a@b.co", "c@b.co").confirmEmail);
    assert.ok(validateJoinEmail("", "").confirmEmail);
    assert.equal(cleanPremiumEmail(" Alex@Example.COM "), "alex@example.com");
  });

  it("validates names and the optional phone", () => {
    assert.deepEqual(validateJoinName({ firstName: "Alex", lastName: "F", phone: "" }), {});
    assert.ok(validateJoinName({ firstName: " ", lastName: "F", phone: "" }).firstName);
    assert.ok(validateJoinName({ firstName: "A", lastName: "F", phone: "call me" }).phone);
  });

  it("parses the server body and ignores anything but details", () => {
    assert.deepEqual(
      parseJoinDetails({ email: "A@b.co", firstName: " Alex ", lastName: "F", phone: "", amount: 1 }),
      { email: "a@b.co", firstName: "Alex", lastName: "F", phone: null },
    );
    assert.equal(parseJoinDetails({ email: "a@b.co", firstName: "", lastName: "F" }), null);
    assert.equal(parseJoinDetails({ email: "x", firstName: "A", lastName: "F" }), null);
    assert.equal(isStripeSubscriptionId("sub_1234567890"), true);
    assert.equal(isStripeSubscriptionId("sub_../x"), false);
  });
});

describe("on-site trial subscriptions", () => {
  const base = {
    id: "sub_123",
    customer: "cus_1",
    status: "trialing",
    trial_end: 1_800_000_000,
    items: { data: [{ price: { id: "price_year" }, current_period_end: 1_800_000_000 }] },
    metadata: { source: "premium-join", email: "Reader@Example.com" },
  };

  it("is not a membership until the card is saved", () => {
    const pending = { ...base, pending_setup_intent: "seti_1", default_payment_method: null };
    assert.equal(awaitingTrialPaymentMethod(pending), true);
    const sync = membershipFromSubscription(pending, IDS);
    assert.equal(sync?.membership.status, "incomplete");
    assert.equal(sync?.email, "reader@example.com");
    assert.equal(sync?.userId, null);
  });

  it("becomes a trial once the card is saved", () => {
    const saved = { ...base, pending_setup_intent: null, default_payment_method: "pm_1" };
    assert.equal(awaitingTrialPaymentMethod(saved), false);
    assert.equal(membershipFromSubscription(saved, IDS)?.membership.status, "trialing");
  });

  it("leaves hosted Checkout trials alone", () => {
    const hosted = { ...base, metadata: { userId: "u1" }, pending_setup_intent: null };
    const sync = membershipFromSubscription(hosted, IDS);
    assert.equal(sync?.membership.status, "trialing");
    assert.equal(sync?.userId, "u1");
  });
});

describe("focused checkout chrome", () => {
  it("hides the tab bar and ticker on /premium/join only", () => {
    assert.equal(isFocusedTripChrome("/premium/join", "?plan=yearly"), true);
    assert.equal(isFocusedTripChrome("/premium", ""), false);
    assert.match(TRIP_FOCUS_BOOT, /\/premium\/join/);
  });
});
