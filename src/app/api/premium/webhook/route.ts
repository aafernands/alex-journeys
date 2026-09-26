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
  type MembershipRecord,
} from "@/lib/membership";
import {
  findUserIdByStripeCustomer,
  getMembership,
  saveMembership,
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

async function resolveUserId(
  userId: string | null,
  customerId: string | null,
): Promise<string | null> {
  if (userId) return userId;
  if (!customerId) return null;
  return findUserIdByStripeCustomer(customerId);
}

async function applyRecord(
  userId: string,
  next: MembershipRecord,
  eventCreated: number,
): Promise<"saved" | "stale" | "ignored"> {
  const existing = await getMembership(userId);
  if (isStaleStripeEvent(existing, eventCreated)) return "stale";
  if (!subscriptionAppliesToMember(next, existing)) return "ignored";
  await saveMembership(userId, withStripeEvent(next, eventCreated));
  return "saved";
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
      const userId = await resolveUserId(checkout.userId ?? fromSession.userId, fromSession.customerId);
      if (!userId) return NextResponse.json({ received: true, ignored: "user" });
      const result = await applyRecord(userId, fromSession.membership, event.created);
      return NextResponse.json({ received: true, result });
    }

    if (event.type.startsWith("customer.subscription.")) {
      const sync = membershipFromSubscription(event.data.object, premiumPriceIds());
      if (!sync) return NextResponse.json({ received: true, ignored: "subscription" });
      const userId = await resolveUserId(sync.userId, sync.customerId);
      if (!userId) return NextResponse.json({ received: true, ignored: "user" });
      const result = await applyRecord(userId, sync.membership, event.created);
      return NextResponse.json({ received: true, result });
    }

    if (event.type === "invoice.payment_failed") {
      const refs = readInvoiceRefs(event.data.object);
      if (!refs?.customerId && !refs?.subscriptionId) {
        return NextResponse.json({ received: true, ignored: "invoice" });
      }
      let sync = refs.subscriptionId
        ? await subscriptionSyncFromId(refs.subscriptionId)
        : null;
      if (!sync && refs.subscriptionId) {
        return NextResponse.json({ error: "Subscription missing." }, { status: 500 });
      }
      const userId = await resolveUserId(sync?.userId ?? null, refs.customerId ?? sync?.customerId ?? null);
      if (!userId) return NextResponse.json({ received: true, ignored: "user" });
      const existing = await getMembership(userId);
      if (isStaleStripeEvent(existing, event.created)) {
        return NextResponse.json({ received: true, result: "stale" });
      }
      const base = sync?.membership ?? existing;
      if (!base) return NextResponse.json({ received: true, ignored: "membership" });
      if (sync && !subscriptionAppliesToMember(sync.membership, existing)) {
        return NextResponse.json({ received: true, ignored: "product" });
      }
      const next = membershipAfterPaymentFailed(base);
      await saveMembership(userId, withStripeEvent(next, event.created));
      return NextResponse.json({ received: true, result: "saved" });
    }
  } catch (err) {
    console.error("[premium] webhook failed:", event.type, err);
    return NextResponse.json({ error: "Could not update membership." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
