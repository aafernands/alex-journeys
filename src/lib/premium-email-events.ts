/**
 * Which Premium email a Stripe webhook event should send (pure, no I/O).
 * The webhook route calls planPremiumEmails() and then sendPremiumEmails()
 * in premium-emails.ts, which makes each send idempotent in Firestore.
 *
 * Keys decide "once": the same key never sends twice, so Stripe retries and
 * the several subscription.updated events around a checkout are harmless.
 * - welcome:{subscriptionId}           first time the subscription is active or trialing
 * - trial-ending:{subscriptionId}:{trialEnd}
 * - renewed:{invoiceId}                invoice.paid with billing_reason subscription_cycle
 * - payment-failed:{invoiceId}         one per failed invoice (not per retry)
 * - cancel:{subscriptionId}            one per subscription: "canceled, access until"
 *                                      or, if that was never sent, "ended"
 */
import {
  formatUsd,
  isPremium,
  type MembershipRecord,
  type PremiumPlan,
} from "@/lib/membership";

export type PremiumEmailPlan =
  | {
      kind: "welcome";
      key: string;
      plan: PremiumPlan | null;
      amount: string;
      trialEnd: string | null;
      nextRenewal: string | null;
    }
  | { kind: "trial-ending"; key: string; plan: PremiumPlan | null; amount: string; trialEnd: string | null }
  | { kind: "renewed"; key: string; plan: PremiumPlan | null; amount: string; nextRenewal: string | null }
  | { kind: "payment-failed"; key: string; plan: PremiumPlan | null; amount: string; nextAttempt: string | null }
  | { kind: "canceled"; key: string; plan: PremiumPlan | null; accessUntil: string | null; ended: boolean };

export type PlanAmounts = { monthlyCents: number; yearlyCents: number; currency?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function unixToIso(value: unknown): string | null {
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

export function formatMoney(cents: number, currency = "usd"): string {
  const code = (currency || "usd").toLowerCase();
  if (code === "usd") return formatUsd(cents);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code.toUpperCase()}`;
  }
}

/** Price per period for the plan: the subscription item's price, else the configured plan price. */
export function subscriptionAmount(
  subscription: unknown,
  plan: PremiumPlan | null,
  amounts: PlanAmounts,
): string {
  const items = asRecord(asRecord(subscription)?.items);
  const first = asRecord(Array.isArray(items?.data) ? items.data[0] : null);
  const price = asRecord(first?.price);
  const unit = typeof price?.unit_amount === "number" ? price.unit_amount : null;
  const currency = typeof price?.currency === "string" ? price.currency : amounts.currency;
  if (unit !== null && unit > 0) return formatMoney(unit, currency);
  const cents = plan === "yearly" ? amounts.yearlyCents : amounts.monthlyCents;
  return formatMoney(cents, amounts.currency);
}

/** Future cancel date from cancel_at_period_end or cancel_at, else null. */
export function scheduledCancelDate(subscription: unknown, membership: MembershipRecord): string | null {
  const record = asRecord(subscription);
  const cancelAt = unixToIso(record?.cancel_at);
  if (membership.cancelAtPeriodEnd) {
    if (membership.status === "trialing") return membership.trialEnd ?? cancelAt ?? membership.currentPeriodEnd;
    return membership.currentPeriodEnd ?? cancelAt;
  }
  if (cancelAt && Date.parse(cancelAt) > Date.now()) return cancelAt;
  return null;
}

/**
 * Emails for a subscription snapshot (checkout.session.completed and
 * customer.subscription.*). `subscription` is the raw Stripe object.
 */
export const WELCOME_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function planSubscriptionEmails(
  eventType: string,
  subscription: unknown,
  membership: MembershipRecord,
  amounts: PlanAmounts,
  options: { previousAttributes?: unknown; now?: number } = {},
): PremiumEmailPlan[] {
  const now = options.now ?? Date.now();
  const subId = membership.stripeSubscriptionId;
  if (!subId || !membership.plan) return [];
  const amount = subscriptionAmount(subscription, membership.plan, amounts);
  const out: PremiumEmailPlan[] = [];

  if (eventType === "customer.subscription.deleted") {
    const record = asRecord(subscription);
    out.push({
      kind: "canceled",
      key: `cancel:${subId}`,
      plan: membership.plan,
      accessUntil: unixToIso(record?.ended_at) ?? new Date().toISOString(),
      ended: true,
    });
    return out;
  }

  if (eventType === "customer.subscription.trial_will_end") {
    if (membership.status === "trialing" && !scheduledCancelDate(subscription, membership)) {
      out.push({
        kind: "trial-ending",
        key: `trial-ending:${subId}:${membership.trialEnd ?? "unknown"}`,
        plan: membership.plan,
        amount,
        trialEnd: membership.trialEnd,
      });
    }
    return out;
  }

  if (isPremium({ membership })) {
    // Only brand-new subscriptions get a welcome, so members who joined
    // before these emails existed don't get one on their next update.
    const createdAt = unixToIso(asRecord(subscription)?.created);
    const isNew = createdAt ? now - Date.parse(createdAt) < WELCOME_WINDOW_MS : false;
    const trialing = membership.status === "trialing" && Boolean(membership.trialEnd);
    if (isNew) {
      out.push({
        kind: "welcome",
        key: `welcome:${subId}`,
        plan: membership.plan,
        amount,
        trialEnd: trialing ? membership.trialEnd : null,
        nextRenewal: trialing ? null : membership.currentPeriodEnd,
      });
    }
    // Cancel notice only when this event is the change that scheduled it
    // (or a brand-new subscription that is already set to end).
    const previous = asRecord(options.previousAttributes);
    const cancelChanged =
      eventType === "customer.subscription.updated"
        ? Boolean(previous && ("cancel_at_period_end" in previous || "cancel_at" in previous))
        : isNew;
    const cancelOn = scheduledCancelDate(subscription, membership);
    if (cancelOn && cancelChanged) {
      out.push({
        kind: "canceled",
        key: `cancel:${subId}`,
        plan: membership.plan,
        accessUntil: cancelOn,
        ended: false,
      });
    }
  }
  return out;
}

export type InvoiceFacts = {
  id: string | null;
  billingReason: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  nextPaymentAttempt: string | null;
};

export function readInvoiceFacts(invoice: unknown): InvoiceFacts {
  const r = asRecord(invoice) ?? {};
  return {
    id: typeof r.id === "string" ? r.id : null,
    billingReason: typeof r.billing_reason === "string" ? r.billing_reason : null,
    amountPaid: typeof r.amount_paid === "number" ? r.amount_paid : 0,
    amountDue: typeof r.amount_due === "number" ? r.amount_due : 0,
    currency: typeof r.currency === "string" ? r.currency : "usd",
    nextPaymentAttempt: unixToIso(r.next_payment_attempt),
  };
}

/** invoice.paid → renewal email (only real renewals with a charge). */
export function planInvoicePaidEmail(
  invoice: InvoiceFacts,
  membership: MembershipRecord | null,
): PremiumEmailPlan | null {
  if (!invoice.id || invoice.billingReason !== "subscription_cycle" || invoice.amountPaid <= 0) return null;
  if (!membership?.plan) return null;
  return {
    kind: "renewed",
    key: `renewed:${invoice.id}`,
    plan: membership.plan,
    amount: formatMoney(invoice.amountPaid, invoice.currency),
    nextRenewal: membership.currentPeriodEnd,
  };
}

/** invoice.payment_failed → one email per failed invoice. */
export function planPaymentFailedEmail(
  invoice: InvoiceFacts,
  membership: MembershipRecord | null,
): PremiumEmailPlan | null {
  if (!invoice.id || invoice.amountDue <= 0) return null;
  if (!membership?.plan) return null;
  if (membership.status === "canceled" || membership.status === "incomplete_expired") return null;
  // First payment on a brand-new checkout: the checkout page already shows the error.
  if (invoice.billingReason === "subscription_create") return null;
  return {
    kind: "payment-failed",
    key: `payment-failed:${invoice.id}`,
    plan: membership.plan,
    amount: formatMoney(invoice.amountDue, invoice.currency),
    nextAttempt: invoice.nextPaymentAttempt,
  };
}
