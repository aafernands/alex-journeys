import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { escapeHtml, firstNameOf, renderEmail } from "../src/lib/emails/layout.ts";
import {
  passwordResetEmail,
  paymentFailedEmail,
  premiumWelcomeEmail,
  subscriptionCanceledEmail,
  subscriptionRenewedEmail,
  trialEndingEmail,
  emailVerificationEmail,
} from "../src/lib/emails/templates.ts";
import { EMAIL_SAMPLES } from "../src/lib/emails/samples.ts";
import {
  checkVerificationRecord,
  generateVerificationCode,
  hashVerificationSecret,
  isEmailVerifiedProfile,
  MAX_SENDS_PER_HOUR,
  normalizeVerificationCode,
  secretMatches,
  verificationSendAllowance,
} from "../src/lib/email-verification.ts";
import {
  planInvoicePaidEmail,
  planPaymentFailedEmail,
  planSubscriptionEmails,
  readInvoiceFacts,
  subscriptionAmount,
} from "../src/lib/premium-email-events.ts";
import { emailReplyToAddress, sendEmailSafe, supportEmailAddress } from "../src/lib/email.ts";

const ctx = { siteUrl: "https://www.alexjourneys.com", supportEmail: "support@alexjourneys.com", year: 2026 };
const DAY = 86_400_000;

describe("email layout", () => {
  it("renders brand header, greeting, details, button and footer", () => {
    const out = subscriptionRenewedEmail(
      { name: "Maria Lopez", plan: "monthly", amount: "$9.99", nextRenewal: "2026-10-26T00:00:00.000Z" },
      ctx,
    );
    assert.match(out.html, /#d97706/);
    assert.match(out.html, /#f6f0e6/);
    assert.match(out.html, /#b45309/);
    assert.match(out.html, /Alex Journeys/);
    assert.match(out.html, /✓ Subscription Renewed Successfully/);
    assert.match(out.html, /Hi <strong>Maria<\/strong>/);
    assert.match(out.html, /Amount billed/);
    assert.match(out.html, /October 26, 2026/);
    assert.match(out.html, /The Alex Journeys Team/);
    assert.match(out.html, /support@alexjourneys\.com/);
    assert.match(out.html, /© 2026 Alex Journeys|&copy; 2026 Alex Journeys/);
    assert.match(out.html, /\/account#membership/);
    assert.match(out.text, /Hi Maria,/);
    assert.match(out.text, /Next renewal date: +October 26, 2026/);
    assert.match(out.text, /The Alex Journeys Team/);
    assert.doesNotMatch(out.text, /<[a-z]/i);
  });

  it("escapes names and falls back to 'there'", () => {
    const out = passwordResetEmail({ name: "<script>x</script>", resetUrl: "https://a.test/r?t=1&u=2" }, ctx);
    assert.doesNotMatch(out.html, /<script>/);
    assert.match(out.html, /&lt;script&gt;/);
    assert.match(out.html, /t=1&amp;u=2/);
    const anon = passwordResetEmail({ name: null, resetUrl: "https://a.test" }, ctx);
    assert.match(anon.text, /^Hi there,/);
    assert.equal(firstNameOf("  Ana  Maria "), "Ana");
    assert.equal(escapeHtml(`"'`), "&quot;&#039;");
  });

  it("shows the verification code", () => {
    const out = emailVerificationEmail({ name: "Sam", code: "012345", verifyUrl: "https://x.test/v", minutes: 30 }, ctx);
    assert.match(out.html, /012345/);
    assert.match(out.text, /Your code: 012345/);
  });

  it("trial welcome shows trial end and first charge", () => {
    const out = premiumWelcomeEmail(
      { name: "Maria", plan: "monthly", amount: "$9.99", trialEnd: "2026-10-03T12:00:00.000Z" },
      ctx,
    );
    assert.match(out.subject, /free trial has started/);
    assert.match(out.text, /Free trial ends: +October 3, 2026/);
    assert.match(out.text, /First charge: +\$9\.99 on October 3, 2026/);
  });

  it("other premium templates render without technical wording", () => {
    const all = [
      trialEndingEmail({ name: "M", plan: "yearly", amount: "$99", trialEnd: "2026-10-01T00:00:00Z" }, ctx),
      paymentFailedEmail({ name: "M", plan: "monthly", amount: "$9.99", nextAttempt: null }, ctx),
      subscriptionCanceledEmail({ name: "M", plan: "monthly", accessUntil: "2026-11-01T00:00:00Z", ended: false }, ctx),
      subscriptionCanceledEmail({ name: "M", plan: "monthly", accessUntil: "2026-11-01T00:00:00Z", ended: true }, ctx),
    ];
    for (const email of all) {
      assert.doesNotMatch(email.text, /stripe|webhook|invoice|subscription_/i);
      assert.match(email.html, /The Alex Journeys Team/);
    }
    assert.match(all[2].text, /Access until: +November 1, 2026/);
  });

  it("every sample renders", () => {
    const ids = new Set();
    for (const sample of EMAIL_SAMPLES) {
      assert.ok(!ids.has(sample.id), sample.id);
      ids.add(sample.id);
      const out = sample.render(ctx);
      assert.ok(out.subject.length > 5);
      assert.match(out.html, /^<!DOCTYPE html>/);
      assert.ok(out.text.length > 50);
    }
  });

  it("renderEmail supports links in paragraphs", () => {
    const out = renderEmail({
      ...ctx,
      subject: "s",
      preheader: "p",
      badge: "b",
      firstName: null,
      paragraphs: [["Go to ", { link: "Account", href: "https://x.test/a" }, "."]],
    });
    assert.match(out.html, /<a href="https:\/\/x\.test\/a"/);
    assert.match(out.text, /Go to Account \(https:\/\/x\.test\/a\)\./);
  });
});

describe("email verification rules", () => {
  it("decides who counts as verified", () => {
    assert.equal(isEmailVerifiedProfile({ email: "a@b.co", emailVerified: true }), true);
    assert.equal(isEmailVerifiedProfile({ email: "a@b.co", emailVerified: false, providers: ["google"] }), false);
    assert.equal(isEmailVerifiedProfile({ email: "a@b.co", providers: ["google"] }), true);
    assert.equal(isEmailVerifiedProfile({ email: "a@b.co", providers: ["credentials"] }), false);
    assert.equal(isEmailVerifiedProfile({ email: "", emailVerified: true }), false);
    assert.equal(isEmailVerifiedProfile({ email: "a@b.co", providers: ["twitter"] }), false);
  });

  it("codes are six digits and compare safely", () => {
    for (let i = 0; i < 50; i += 1) assert.match(generateVerificationCode(), /^\d{6}$/);
    assert.equal(normalizeVerificationCode(" 123 456 "), "123456");
    assert.equal(normalizeVerificationCode("12345"), null);
    assert.equal(normalizeVerificationCode("abcdef"), null);
    const hash = hashVerificationSecret("u1", "123456");
    assert.equal(secretMatches("u1", "123456", hash), true);
    assert.equal(secretMatches("u2", "123456", hash), false);
    assert.equal(secretMatches("u1", "654321", hash), false);
    assert.equal(secretMatches("u1", "123456", "short"), false);
  });

  it("limits resends to one a minute and five an hour", () => {
    const now = 10 * 60 * 60 * 1000;
    assert.equal(verificationSendAllowance([], now).ok, true);
    const soon = verificationSendAllowance([now - 10_000], now);
    assert.equal(soon.ok, false);
    assert.ok(!soon.ok && soon.retryAfterSec <= 50);
    const many = Array.from({ length: MAX_SENDS_PER_HOUR }, (_, i) => now - (i + 2) * 5 * 60_000);
    assert.equal(verificationSendAllowance(many, now).ok, false);
    const old = Array.from({ length: 10 }, (_, i) => now - 2 * 60 * 60 * 1000 - i);
    const fresh = verificationSendAllowance(old, now);
    assert.ok(fresh.ok && fresh.recent.length === 1);
  });

  it("rejects expired, locked or re-addressed records", () => {
    const now = Date.now();
    const good = { email: "a@b.co", expiresAt: new Date(now + 60_000).toISOString(), attempts: 0 };
    assert.deepEqual(checkVerificationRecord(good, "A@b.co", now), { ok: true });
    assert.equal(checkVerificationRecord(null, "a@b.co", now).ok, false);
    assert.deepEqual(checkVerificationRecord({ ...good, email: "c@d.co" }, "a@b.co", now), { ok: false, reason: "email_changed" });
    assert.deepEqual(checkVerificationRecord({ ...good, expiresAt: new Date(now - 1).toISOString() }, "a@b.co", now), { ok: false, reason: "expired" });
    assert.deepEqual(checkVerificationRecord({ ...good, attempts: 5 }, "a@b.co", now), { ok: false, reason: "locked" });
  });
});

function membership(overrides = {}) {
  return {
    status: "active",
    plan: "monthly",
    currentPeriodEnd: "2026-10-26T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    trialEnd: null,
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: "sub_1",
    priceId: "price_m",
    stripeEventAt: null,
    ...overrides,
  };
}
const amounts = { monthlyCents: 999, yearlyCents: 9900, currency: "usd" };
const NOW = Date.parse("2026-09-26T12:00:00Z");
const newSub = { created: NOW / 1000 - 60, items: { data: [{ price: { unit_amount: 999, currency: "usd" } }] } };
const oldSub = { created: NOW / 1000 - 90 * 86400, items: newSub.items };

describe("premium email planning", () => {
  it("welcomes new subscriptions once (keyed by subscription)", () => {
    const plans = planSubscriptionEmails("customer.subscription.updated", newSub, membership({ status: "trialing", trialEnd: "2026-10-03T00:00:00Z" }), amounts, { now: NOW });
    assert.equal(plans.length, 1);
    assert.equal(plans[0].kind, "welcome");
    assert.equal(plans[0].key, "welcome:sub_1");
    assert.equal(plans[0].trialEnd, "2026-10-03T00:00:00Z");
    assert.equal(plans[0].amount, "$9.99");
  });

  it("does not welcome members who joined long ago", () => {
    assert.deepEqual(planSubscriptionEmails("customer.subscription.updated", oldSub, membership(), amounts, { now: NOW }), []);
  });

  it("skips incomplete subscriptions and non-Premium prices", () => {
    assert.deepEqual(planSubscriptionEmails("customer.subscription.created", newSub, membership({ status: "incomplete" }), amounts, { now: NOW }), []);
    assert.deepEqual(planSubscriptionEmails("customer.subscription.created", newSub, membership({ plan: null }), amounts, { now: NOW }), []);
  });

  it("sends the cancel notice only when renewal was just turned off", () => {
    const canceled = membership({ cancelAtPeriodEnd: true });
    assert.deepEqual(planSubscriptionEmails("customer.subscription.updated", oldSub, canceled, amounts, { now: NOW }), []);
    const plans = planSubscriptionEmails("customer.subscription.updated", oldSub, canceled, amounts, {
      now: NOW,
      previousAttributes: { cancel_at_period_end: false },
    });
    assert.equal(plans.length, 1);
    assert.equal(plans[0].kind, "canceled");
    assert.equal(plans[0].key, "cancel:sub_1");
    assert.equal(plans[0].ended, false);
    assert.equal(plans[0].accessUntil, "2026-10-26T00:00:00.000Z");
  });

  it("uses the trial end as the access date when canceled during a trial", () => {
    const plans = planSubscriptionEmails(
      "customer.subscription.updated",
      oldSub,
      membership({ status: "trialing", trialEnd: "2026-10-01T00:00:00Z", cancelAtPeriodEnd: true }),
      amounts,
      { now: NOW, previousAttributes: { cancel_at_period_end: false } },
    );
    assert.equal(plans.find((p) => p.kind === "canceled").accessUntil, "2026-10-01T00:00:00Z");
  });

  it("deleted subscriptions share the cancel key", () => {
    const plans = planSubscriptionEmails("customer.subscription.deleted", { ended_at: NOW / 1000 }, membership({ status: "canceled" }), amounts, { now: NOW });
    assert.equal(plans.length, 1);
    assert.equal(plans[0].key, "cancel:sub_1");
    assert.equal(plans[0].ended, true);
  });

  it("trial ending reminder skips trials already set to cancel", () => {
    const trial = membership({ status: "trialing", trialEnd: "2026-09-29T00:00:00Z" });
    const plans = planSubscriptionEmails("customer.subscription.trial_will_end", oldSub, trial, amounts, { now: NOW });
    assert.equal(plans[0].kind, "trial-ending");
    assert.equal(plans[0].key, "trial-ending:sub_1:2026-09-29T00:00:00Z");
    assert.deepEqual(
      planSubscriptionEmails("customer.subscription.trial_will_end", oldSub, { ...trial, cancelAtPeriodEnd: true }, amounts, { now: NOW }),
      [],
    );
  });

  it("renewal emails only for paid renewal invoices", () => {
    const renewal = readInvoiceFacts({ id: "in_1", billing_reason: "subscription_cycle", amount_paid: 999, currency: "usd" });
    const plan = planInvoicePaidEmail(renewal, membership());
    assert.equal(plan.key, "renewed:in_1");
    assert.equal(plan.amount, "$9.99");
    assert.equal(plan.nextRenewal, "2026-10-26T00:00:00.000Z");
    assert.equal(planInvoicePaidEmail({ ...renewal, billingReason: "subscription_create" }, membership()), null);
    assert.equal(planInvoicePaidEmail({ ...renewal, amountPaid: 0 }, membership()), null);
    assert.equal(planInvoicePaidEmail(renewal, membership({ plan: null })), null);
  });

  it("payment failed: one per invoice, not for first checkout or ended plans", () => {
    const facts = readInvoiceFacts({ id: "in_2", billing_reason: "subscription_cycle", amount_due: 9900, currency: "usd", next_payment_attempt: NOW / 1000 + 3 * 86400 });
    const plan = planPaymentFailedEmail(facts, membership({ plan: "yearly" }));
    assert.equal(plan.key, "payment-failed:in_2");
    assert.equal(plan.amount, "$99");
    assert.ok(plan.nextAttempt);
    assert.equal(planPaymentFailedEmail({ ...facts, billingReason: "subscription_create" }, membership()), null);
    assert.equal(planPaymentFailedEmail(facts, membership({ status: "canceled" })), null);
  });

  it("amount falls back to configured plan prices", () => {
    assert.equal(subscriptionAmount({}, "yearly", amounts), "$99");
    assert.equal(subscriptionAmount({ items: { data: [{ price: { unit_amount: 1299, currency: "usd" } }] } }, "monthly", amounts), "$12.99");
    assert.ok(DAY > 0);
  });
});

describe("sending", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    mock.restoreAll();
  });

  it("skips quietly when the Resend key is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = mock.method(globalThis, "fetch", async () => new Response("{}"));
    const info = mock.method(console, "info", () => {});
    const result = await sendEmailSafe({ to: "a@b.co", subject: "s", html: "<p>h</p>" }, "test");
    assert.deepEqual(result, { status: "skipped", reason: "not_configured" });
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal(info.mock.callCount(), 1);
  });

  it("sends with reply-to from env", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Alex Journeys Support <support@alexjourneys.com>";
    process.env.EMAIL_REPLY_TO = "help@alexjourneys.com";
    let body;
    mock.method(globalThis, "fetch", async (_url, init) => {
      body = JSON.parse(init.body);
      return new Response(JSON.stringify({ id: "e1" }), { status: 200 });
    });
    const result = await sendEmailSafe({ to: "A@B.co", subject: "s", html: "<p>h</p>", text: "h" });
    assert.deepEqual(result, { status: "sent" });
    assert.equal(body.from, "Alex Journeys Support <support@alexjourneys.com>");
    assert.equal(body.reply_to, "help@alexjourneys.com");
    assert.deepEqual(body.to, ["a@b.co"]);
    assert.equal(body.text, "h");
  });

  it("reports failures without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test";
    mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 }));
    mock.method(console, "error", () => {});
    const result = await sendEmailSafe({ to: "a@b.co", subject: "s", html: "h" });
    assert.equal(result.status, "failed");
  });

  it("support and reply-to defaults", () => {
    delete process.env.SUPPORT_EMAIL;
    delete process.env.EMAIL_REPLY_TO;
    assert.equal(supportEmailAddress(), "support@alexjourneys.com");
    assert.equal(emailReplyToAddress(), "support@alexjourneys.com");
    process.env.SUPPORT_EMAIL = "hello@alexjourneys.com";
    assert.equal(emailReplyToAddress(), "hello@alexjourneys.com");
  });
});
