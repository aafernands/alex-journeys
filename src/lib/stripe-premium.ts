/**
 * Stripe Billing for Premium. Checkout and the customer portal are hosted by
 * Stripe. Booking hotels and flights does not use these price ids.
 */
import Stripe from "stripe";
import { getSiteUrl } from "@/lib/site-url";
import {
  isPremiumCheckoutConfigured,
  membershipFromSubscription,
  premiumPriceIds,
  premiumTrialDays,
  type PremiumPlan,
  type SubscriptionSync,
} from "@/lib/membership";

let stripeClient: Stripe | null = null;
let stripeKey = "";

export function getPremiumStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!key) return null;
  if (!stripeClient || stripeKey !== key) {
    stripeClient = new Stripe(key);
    stripeKey = key;
  }
  return stripeClient;
}

export function premiumCheckoutUrls(): { success: string; cancel: string; portalReturn: string } {
  const origin = getSiteUrl();
  return {
    success: `${origin}/account?section=settings&premium=welcome&session_id={CHECKOUT_SESSION_ID}`,
    cancel: `${origin}/premium`,
    portalReturn: `${origin}/account?section=settings`,
  };
}

export async function createPremiumCheckout(input: {
  userId: string;
  email: string | null;
  plan: PremiumPlan;
  customerId: string | null;
}): Promise<string> {
  const stripe = getPremiumStripe();
  if (!stripe || !isPremiumCheckoutConfigured()) {
    throw new Error("Membership checkout isn’t available yet.");
  }
  const prices = premiumPriceIds();
  const price = input.plan === "yearly" ? prices.yearly : prices.monthly;
  const trialDays = premiumTrialDays();
  const urls = premiumCheckoutUrls();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: input.userId,
    ...(input.customerId
      ? { customer: input.customerId }
      : input.email
        ? { customer_email: input.email }
        : {}),
    line_items: [{ price, quantity: 1 }],
    success_url: urls.success,
    cancel_url: urls.cancel,
    metadata: { userId: input.userId, plan: input.plan },
    subscription_data: {
      metadata: { userId: input.userId, plan: input.plan },
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
    },
  });
  if (!session.url) {
    throw new Error("Checkout didn’t return a link.");
  }
  return session.url;
}

export async function createPremiumPortal(customerId: string): Promise<string> {
  const stripe = getPremiumStripe();
  if (!stripe) {
    throw new Error("Membership checkout isn’t available yet.");
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: premiumCheckoutUrls().portalReturn,
  });
  if (!session.url) {
    throw new Error("The membership page didn’t return a link.");
  }
  return session.url;
}

export async function subscriptionSyncFromId(
  subscriptionId: string,
): Promise<SubscriptionSync | null> {
  const stripe = getPremiumStripe();
  if (!stripe) return null;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return membershipFromSubscription(subscription, premiumPriceIds());
}

export async function subscriptionSyncFromCheckoutSession(
  sessionId: string,
): Promise<SubscriptionSync | null> {
  const stripe = getPremiumStripe();
  if (!stripe) return null;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.mode !== "subscription" || session.status !== "complete") return null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) return null;
  const sync = await subscriptionSyncFromId(subscriptionId);
  if (!sync) return null;
  const owner =
    session.metadata?.userId?.trim() ||
    session.client_reference_id?.trim() ||
    sync.userId;
  return { ...sync, userId: owner || sync.userId };
}
