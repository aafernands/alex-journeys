import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  DEFAULT_MONTHLY_CENTS,
  DEFAULT_YEARLY_CENTS,
  EMPTY_MEMBERSHIP,
  formatMembershipDate,
  formatUsd,
  isPremium,
  isPremiumCheckoutConfigured,
  isStaleStripeEvent,
  membershipAfterPaymentFailed,
  membershipDetail,
  membershipFromSubscription,
  parseMembership,
  premiumPrices,
  premiumTrialDays,
  readCheckoutSession,
  readInvoiceRefs,
  subscriptionAppliesToMember,
  toMembershipPublic,
} from "../src/lib/membership.ts";

const KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PREMIUM_PRICE_MONTHLY",
  "STRIPE_PREMIUM_PRICE_YEARLY",
  "STRIPE_PREMIUM_TRIAL_DAYS",
  "PREMIUM_PRICE_MONTHLY_CENTS",
  "PREMIUM_PRICE_YEARLY_CENTS",
];

const snapshot = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function clearEnv() {
  for (const key of KEYS) delete process.env[key];
}

afterEach(() => {
  for (const key of KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

const PRICES = { monthly: "price_month", yearly: "price_year" };

function subscription(overrides = {}) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    cancel_at_period_end: false,
    trial_end: null,
    metadata: { userId: "user_1" },
    items: {
      data: [
        {
          price: { id: "price_month" },
          current_period_end: 1_800_000_000,
        },
      ],
    },
    ...overrides,
  };
}

describe("premium prices", () => {
  it("defaults to $9.99 a month and $99 a year", () => {
    clearEnv();
    const prices = premiumPrices();
    assert.equal(prices.monthlyCents, DEFAULT_MONTHLY_CENTS);
    assert.equal(prices.yearlyCents, DEFAULT_YEARLY_CENTS);
    assert.equal(prices.monthlyLabel, "$9.99");
    assert.equal(prices.yearlyLabel, "$99");
    assert.equal(prices.yearlyPerMonthLabel, "$8.25");
    assert.equal(prices.savingsLabel, "$20.88");
    assert.equal(prices.savingsPercent, 17);
  });

  it("reads display cents and ignores junk", () => {
    clearEnv();
    process.env.PREMIUM_PRICE_MONTHLY_CENTS = "1500";
    process.env.PREMIUM_PRICE_YEARLY_CENTS = "nope";
    const prices = premiumPrices();
    assert.equal(prices.monthlyLabel, "$15");
    assert.equal(prices.yearlyCents, DEFAULT_YEARLY_CENTS);
  });

  it("treats checkout as unavailable until the secret and both price ids exist", () => {
    clearEnv();
    assert.equal(isPremiumCheckoutConfigured(), false);
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_PREMIUM_PRICE_MONTHLY = "price_month";
    assert.equal(isPremiumCheckoutConfigured(), false);
    process.env.STRIPE_PREMIUM_PRICE_YEARLY = "price_year";
    assert.equal(isPremiumCheckoutConfigured(), true);
  });

  it("turns the trial on only from a whole number of days", () => {
    clearEnv();
    assert.equal(premiumTrialDays(), 0);
    process.env.STRIPE_PREMIUM_TRIAL_DAYS = "7";
    assert.equal(premiumTrialDays(), 7);
    process.env.STRIPE_PREMIUM_TRIAL_DAYS = "0";
    assert.equal(premiumTrialDays(), 0);
    process.env.STRIPE_PREMIUM_TRIAL_DAYS = "400";
    assert.equal(premiumTrialDays(), 90);
  });
});

describe("isPremium", () => {
  it("is true for an active or trialing premium plan", () => {
    assert.equal(isPremium(null), false);
    assert.equal(isPremium({ membership: null }), false);
    assert.equal(isPremium({ membership: EMPTY_MEMBERSHIP }), false);
    assert.equal(
      isPremium({ membership: { ...EMPTY_MEMBERSHIP, status: "active", plan: "monthly" } }),
      true,
    );
    assert.equal(
      isPremium({ membership: { ...EMPTY_MEMBERSHIP, status: "trialing", plan: "yearly" } }),
      true,
    );
    assert.equal(
      isPremium({ membership: { ...EMPTY_MEMBERSHIP, status: "past_due", plan: "monthly" } }),
      false,
    );
    assert.equal(
      isPremium({ membership: { ...EMPTY_MEMBERSHIP, status: "canceled", plan: "yearly" } }),
      false,
    );
    assert.equal(
      isPremium({ membership: { ...EMPTY_MEMBERSHIP, status: "active", plan: null } }),
      false,
    );
  });
});

describe("stripe snapshots", () => {
  it("maps a subscription item period end and monthly price", () => {
    const sync = membershipFromSubscription(subscription(), PRICES);
    assert.ok(sync);
    assert.equal(sync.userId, "user_1");
    assert.equal(sync.membership.plan, "monthly");
    assert.equal(sync.membership.status, "active");
    assert.equal(sync.membership.currentPeriodEnd, new Date(1_800_000_000 * 1000).toISOString());
    assert.equal(sync.membership.stripeCustomerId, "cus_123");
  });

  it("accepts an older current_period_end on the subscription itself", () => {
    const sync = membershipFromSubscription(
      subscription({
        items: { data: [{ price: "price_year" }] },
        current_period_end: 1_700_000_000,
        customer: { id: "cus_123" },
      }),
      PRICES,
    );
    assert.equal(sync?.membership.plan, "yearly");
    assert.equal(sync?.membership.currentPeriodEnd, new Date(1_700_000_000 * 1000).toISOString());
  });

  it("ignores a different product unless it is the stored subscription", () => {
    const other = membershipFromSubscription(
      subscription({ items: { data: [{ price: { id: "price_other" } }] } }),
      PRICES,
    );
    assert.equal(other?.membership.plan, null);
    assert.equal(subscriptionAppliesToMember(other.membership, null), false);
    assert.equal(
      subscriptionAppliesToMember(other.membership, {
        ...other.membership,
        plan: "monthly",
        stripeSubscriptionId: "sub_123",
      }),
      true,
    );
  });

  it("marks a failed renewal past due and leaves a trial alone", () => {
    const active = membershipFromSubscription(subscription(), PRICES).membership;
    assert.equal(membershipAfterPaymentFailed(active).status, "past_due");
    const trial = { ...active, status: "trialing" };
    assert.equal(membershipAfterPaymentFailed(trial).status, "trialing");
  });

  it("drops a webhook older than the stored record", () => {
    const existing = {
      ...membershipFromSubscription(subscription(), PRICES).membership,
      stripeEventAt: "2026-09-26T12:00:00.000Z",
    };
    assert.equal(isStaleStripeEvent(existing, Date.parse("2026-09-26T11:00:00.000Z") / 1000), true);
    assert.equal(isStaleStripeEvent(existing, Date.parse("2026-09-26T13:00:00.000Z") / 1000), false);
  });

  it("reads checkout owners and invoice subscription refs", () => {
    const checkout = readCheckoutSession({
      mode: "subscription",
      status: "complete",
      client_reference_id: "user_9",
      customer: "cus_9",
      subscription: "sub_9",
    });
    assert.deepEqual(checkout, {
      userId: "user_9",
      customerId: "cus_9",
      subscriptionId: "sub_9",
      mode: "subscription",
      complete: true,
    });
    const invoice = readInvoiceRefs({
      customer: "cus_9",
      parent: { subscription_details: { subscription: "sub_9" } },
    });
    assert.deepEqual(invoice, { customerId: "cus_9", subscriptionId: "sub_9" });
  });
});

describe("membership copy", () => {
  it("hides stripe ids from the public shape", () => {
    const sync = membershipFromSubscription(subscription(), PRICES);
    const pub = toMembershipPublic(sync.membership);
    assert.equal("stripeCustomerId" in pub, false);
    assert.equal(pub.plan, "monthly");
  });

  it("describes renewal, trial, and cancel dates", () => {
    assert.equal(formatUsd(1000), "$10");
    assert.equal(formatMembershipDate("2026-03-02T00:00:00.000Z"), "March 2, 2026");
    const base = toMembershipPublic(membershipFromSubscription(subscription(), PRICES).membership);
    assert.match(membershipDetail(base), /^Renews /);
    assert.match(
      membershipDetail({ ...base, status: "trialing", trialEnd: "2026-04-01T00:00:00.000Z" }),
      /^Free trial until April 1, 2026$/,
    );
    assert.match(
      membershipDetail({ ...base, cancelAtPeriodEnd: true }),
      /^Ends /,
    );
    assert.equal(parseMembership({ status: "nope" }), null);
  });
});
