import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  matchesFilter,
  matchesSearch,
  memberBadge,
  membersCsv,
  nextDateFor,
  stripeCustomerUrl,
  summarizeMembers,
} from "../src/lib/cms/members-shared.ts";

const row = (over) => ({
  userId: "u1",
  name: "Ana",
  email: "ana@example.com",
  image: null,
  plan: "monthly",
  status: "active",
  badge: "active",
  cancelAtPeriodEnd: false,
  memberSince: null,
  memberSinceFromStripe: false,
  nextDate: null,
  nextDateLabel: null,
  stripeUrl: null,
  canRefresh: true,
  ...over,
});

describe("cms members helpers", () => {
  it("maps badges", () => {
    assert.equal(memberBadge("trialing", false), "trial");
    assert.equal(memberBadge("active", true), "canceling");
    assert.equal(memberBadge("past_due", false), "past_due");
    assert.equal(memberBadge("canceled", false), "canceled");
  });

  it("summarizes counts and estimated MRR", () => {
    const s = summarizeMembers(
      [
        row({ plan: "monthly", status: "active" }),
        row({ plan: "yearly", status: "active", cancelAtPeriodEnd: true }),
        row({ plan: "yearly", status: "trialing" }),
        row({ plan: "monthly", status: "past_due" }),
        row({ plan: "monthly", status: "canceled" }),
      ],
      { monthlyCents: 900, yearlyCents: 8400 },
    );
    assert.equal(s.activeTotal, 3);
    assert.equal(s.trialing, 1);
    assert.equal(s.canceling, 1);
    assert.equal(s.pastDue, 1);
    assert.equal(s.canceled, 1);
    assert.equal(s.mrrCents, 900 + 700);
    assert.equal(s.mrrWithTrialsCents, 900 + 1400);
  });

  it("filters and searches", () => {
    const trial = row({ status: "trialing", badge: "trial" });
    assert.ok(matchesFilter(trial, "trial"));
    assert.ok(matchesFilter(trial, "all"));
    assert.ok(!matchesFilter(trial, "canceled"));
    assert.ok(matchesSearch(trial, "ANA@"));
    assert.ok(!matchesSearch(trial, "bob"));
  });

  it("picks the next date", () => {
    const t = nextDateFor({ status: "trialing", cancelAtPeriodEnd: false, trialEnd: "2026-10-03", currentPeriodEnd: "2026-10-03" });
    assert.deepEqual(t, { date: "2026-10-03", label: "Trial ends" });
    const r = nextDateFor({ status: "active", cancelAtPeriodEnd: false, trialEnd: null, currentPeriodEnd: "2027-01-01" });
    assert.equal(r.label, "Renews");
  });

  it("builds test/live Stripe links and rejects bad ids", () => {
    assert.equal(stripeCustomerUrl("cus_ABC123", "sk_test_x"), "https://dashboard.stripe.com/test/customers/cus_ABC123");
    assert.equal(stripeCustomerUrl("cus_ABC123", "sk_live_x"), "https://dashboard.stripe.com/customers/cus_ABC123");
    assert.equal(stripeCustomerUrl("../evil", "sk_test_x"), null);
    assert.equal(stripeCustomerUrl(null, "sk_test_x"), null);
  });

  it("escapes CSV cells and neutralizes formulas", () => {
    const csv = membersCsv([row({ name: "=HYPERLINK(\"x\")", email: "a,b@example.com" })]);
    const line = csv.split("\n")[1];
    assert.ok(line.startsWith("\"'=HYPERLINK"));
    assert.ok(line.includes("\"a,b@example.com\""));
  });

  it("keeps member data behind CMS auth", () => {
    const route = readFileSync("src/app/api/cms/members/refresh/route.ts", "utf8");
    assert.match(route, /isCmsAuthenticated\(\)/);
    const shared = readFileSync("src/lib/cms/members-shared.ts", "utf8");
    assert.doesNotMatch(shared, /subscriptionId|STRIPE_SECRET_KEY/);
  });
});
