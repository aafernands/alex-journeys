import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  isStaleStripeEvent,
  membershipAfterPaymentFailed,
  membershipFromSubscription,
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
} from "@/lib/membership-store";
import { getPremiumStripe, subscriptionSyncFromId } from "@/lib/stripe-premium";

export const runtime = "nodejs";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
]);

/*
 * Owner lookup (see resolveMembershipTarget): metadata userId, then the
 * reader holding this Stripe customer, then a reader with the buyer email
 * from on-site checkout, then a pending record for that email that moves to
 * the account on first sign-in. Hosted Checkout always carries a userId.
 */

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

  let event: { id: string; type: string; created: number; data: { object: unknown } };
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret) as typeof event;
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
      const fromSession = await subscriptionSyncFromId(checkout.subscriptionId);
      if (!fromSession) {
        return NextResponse.json({ error: "Subscription missing." }, { status: 500 });
      }
      const { result, target } = await applySubscriptionSync(
        { ...fromSession, userId: checkout.userId ?? fromSession.userId },
        event.created,
      );
      if (!target) return NextResponse.json({ received: true, ignored: "user" });
      return NextResponse.json({ received: true, result });
    }

    if (event.type.startsWith("customer.subscription.")) {
      const sync = membershipFromSubscription(event.data.object, premiumPriceIds());
      if (!sync) return NextResponse.json({ received: true, ignored: "subscription" });
      const { result, target } = await applySubscriptionSync(sync, event.created);
      if (!target) return NextResponse.json({ received: true, ignored: "user" });
      return NextResponse.json({ received: true, result });
    }

    if (event.type === "invoice.payment_failed") {
      const refs = readInvoiceRefs(event.data.object);
      if (!refs?.customerId && !refs?.subscriptionId) {
        return NextResponse.json({ received: true, ignored: "invoice" });
      }
      const sync = refs.subscriptionId
        ? await subscriptionSyncFromId(refs.subscriptionId)
        : null;
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
      return NextResponse.json({ received: true, result: "saved" });
    }
  } catch (err) {
    console.error("[premium] webhook failed:", event.type, err);
    return NextResponse.json({ error: "Could not update membership." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
