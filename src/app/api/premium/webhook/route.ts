import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  isStaleStripeEvent,
  membershipAfterPaymentFailed,
  membershipFromSubscription,
  premiumPrices,
  premiumPriceIds,
  readCheckoutSession,
  readInvoiceRefs,
  subscriptionAppliesToMember,
  withStripeEvent,
} from "@/lib/membership";
import {
  applySubscriptionSync,
  readTargetMembership,
  resolveMembershipTarget,
  saveTargetMembership,
  type MembershipTarget,
} from "@/lib/membership-store";
import {
  planInvoicePaidEmail,
  planPaymentFailedEmail,
  planSubscriptionEmails,
  readInvoiceFacts,
  type PremiumEmailPlan,
} from "@/lib/premium-email-events";
import { sendPremiumEmails } from "@/lib/premium-emails";
import {
  getPremiumStripe,
  premiumChargeAmounts,
  subscriptionWithSync,
} from "@/lib/stripe-premium";

export const runtime = "nodejs";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
]);

/*
 * Owner lookup (see resolveMembershipTarget): metadata userId, then the
 * reader holding this Stripe customer, then a reader who has verified the
 * buyer email, then a pending record for that email that moves to the
 * account once a reader with that verified email signs in.
 *
 * Emails (see premium-email-events.ts and docs/EMAILS.md) are sent after the
 * membership is saved, once per key, and never fail the webhook.
 */

type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: unknown; previous_attributes?: unknown };
};

async function planAmounts() {
  const prices = premiumPrices();
  return premiumChargeAmounts({ monthlyCents: prices.monthlyCents, yearlyCents: prices.yearlyCents });
}

async function notify(
  event: StripeEvent,
  plans: PremiumEmailPlan[],
  target: MembershipTarget | null,
  customerId: string | null,
) {
  try {
    await sendPremiumEmails({ plans, target, customerId, eventId: event.id, eventType: event.type });
  } catch (err) {
    console.error("[premium] webhook email step failed:", event.type, err);
  }
}

export async function POST(request: Request) {
  const stripe = getPremiumStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook isn’t configured." }, { status: 503 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "Accounts aren’t available." }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret) as unknown as StripeEvent;
  } catch (err) {
    console.warn("[premium] webhook signature rejected:", err instanceof Error ? err.message : "invalid");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const checkout = readCheckoutSession(event.data.object);
      if (!checkout || checkout.mode !== "subscription" || !checkout.complete) {
        return NextResponse.json({ received: true, ignored: "session" });
      }
      if (!checkout.subscriptionId) {
        return NextResponse.json({ received: true, ignored: "subscription" });
      }
      const fromSession = await subscriptionWithSync(checkout.subscriptionId);
      if (!fromSession) {
        return NextResponse.json({ error: "Subscription missing." }, { status: 500 });
      }
      const sync = { ...fromSession.sync, userId: checkout.userId ?? fromSession.sync.userId };
      const { result, target } = await applySubscriptionSync(sync, event.created);
      if (!target) return NextResponse.json({ received: true, ignored: "user" });
      if (result !== "ignored") {
        await notify(
          event,
          planSubscriptionEmails(event.type, fromSession.subscription, sync.membership, await planAmounts()),
          target,
          sync.customerId,
        );
      }
      return NextResponse.json({ received: true, result });
    }

    if (event.type.startsWith("customer.subscription.")) {
      const sync = membershipFromSubscription(event.data.object, premiumPriceIds());
      if (!sync) return NextResponse.json({ received: true, ignored: "subscription" });
      const { result, target } = await applySubscriptionSync(sync, event.created);
      if (!target) return NextResponse.json({ received: true, ignored: "user" });
      if (result !== "ignored" && subscriptionAppliesToMember(sync.membership, null)) {
        await notify(
          event,
          planSubscriptionEmails(event.type, event.data.object, sync.membership, await planAmounts(), {
            previousAttributes: event.data.previous_attributes,
          }),
          target,
          sync.customerId,
        );
      }
      return NextResponse.json({ received: true, result });
    }

    if (event.type === "invoice.paid") {
      const refs = readInvoiceRefs(event.data.object);
      const facts = readInvoiceFacts(event.data.object);
      if (!refs?.subscriptionId || facts.billingReason !== "subscription_cycle" || facts.amountPaid <= 0) {
        return NextResponse.json({ received: true, ignored: "invoice" });
      }
      const fresh = await subscriptionWithSync(refs.subscriptionId);
      if (!fresh) return NextResponse.json({ received: true, ignored: "subscription" });
      const target = await resolveMembershipTarget({
        userId: fresh.sync.userId,
        customerId: refs.customerId ?? fresh.sync.customerId,
        email: fresh.sync.email ?? null,
      });
      if (!target) return NextResponse.json({ received: true, ignored: "user" });
      const plan = planInvoicePaidEmail(facts, fresh.sync.membership);
      if (plan) await notify(event, [plan], target, refs.customerId ?? fresh.sync.customerId);
      return NextResponse.json({ received: true, result: plan ? "notified" : "ignored" });
    }

    if (event.type === "invoice.payment_failed") {
      const refs = readInvoiceRefs(event.data.object);
      if (!refs?.customerId && !refs?.subscriptionId) {
        return NextResponse.json({ received: true, ignored: "invoice" });
      }
      const fresh = refs.subscriptionId ? await subscriptionWithSync(refs.subscriptionId) : null;
      const sync = fresh?.sync ?? null;
      if (!sync && refs.subscriptionId) {
        return NextResponse.json({ error: "Subscription missing." }, { status: 500 });
      }
      const target = await resolveMembershipTarget({
        userId: sync?.userId ?? null,
        customerId: refs.customerId ?? sync?.customerId ?? null,
        email: sync?.email ?? null,
      });
      if (!target) return NextResponse.json({ received: true, ignored: "user" });
      const existing = await readTargetMembership(target);
      if (isStaleStripeEvent(existing, event.created)) {
        return NextResponse.json({ received: true, result: "stale" });
      }
      const base = sync?.membership ?? existing;
      if (!base) return NextResponse.json({ received: true, ignored: "membership" });
      if (sync && !subscriptionAppliesToMember(sync.membership, existing)) {
        return NextResponse.json({ received: true, ignored: "product" });
      }
      const next = membershipAfterPaymentFailed(base);
      await saveTargetMembership(target, withStripeEvent(next, event.created));
      const plan = planPaymentFailedEmail(readInvoiceFacts(event.data.object), base);
      if (plan) await notify(event, [plan], target, refs.customerId ?? sync?.customerId ?? null);
      return NextResponse.json({ received: true, result: "saved" });
    }
  } catch (err) {
    console.error("[premium] webhook failed:", event.type, err);
    return NextResponse.json({ error: "Could not update membership." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
