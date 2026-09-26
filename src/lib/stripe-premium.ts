/**
 * Stripe Billing for Premium. The on-site checkout (/premium/join) uses the
 * Payment Element on an incomplete subscription; hosted Checkout stays as the
 * fallback when no Premium publishable key is set. The portal is hosted. Booking hotels and flights does not use these price ids.
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
import type { JoinDetails } from "@/lib/premium-join";

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

/** Raw subscription plus its membership snapshot (webhook emails need both). */
export async function subscriptionWithSync(
  subscriptionId: string,
): Promise<{ subscription: unknown; sync: SubscriptionSync } | null> {
  const stripe = getPremiumStripe();
  if (!stripe) return null;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const sync = membershipFromSubscription(subscription, premiumPriceIds());
  return sync ? { subscription, sync } : null;
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

/* ——— On-site checkout (/premium/join) ——— */

export const PREMIUM_JOIN_SOURCE = "premium-join";

export type PremiumSubscribeResult =
  | {
      kind: "ready";
      subscriptionId: string;
      clientSecret: string;
      intentType: "payment" | "setup";
    }
  | { kind: "already_member" }
  | { kind: "complete"; subscriptionId: string };

function premiumPlanForPrice(priceId: string | null | undefined): PremiumPlan | null {
  const ids = premiumPriceIds();
  if (priceId && priceId === ids.monthly) return "monthly";
  if (priceId && priceId === ids.yearly) return "yearly";
  return null;
}

function subscriptionPriceId(subscription: Stripe.Subscription): string | null {
  const price = subscription.items?.data?.[0]?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

function setupIntentOf(subscription: Stripe.Subscription): Stripe.SetupIntent | null {
  const intent = subscription.pending_setup_intent;
  return intent && typeof intent === "object" ? intent : null;
}

function invoiceSecretOf(subscription: Stripe.Subscription): string | null {
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === "string") return null;
  return invoice.confirmation_secret?.client_secret ?? null;
}

/** Client secret the Payment Element confirms, or null when nothing is owed. */
function clientSecretFor(
  subscription: Stripe.Subscription,
): { clientSecret: string; intentType: "payment" | "setup" } | null {
  if (subscription.status === "trialing") {
    const setup = setupIntentOf(subscription);
    if (setup?.client_secret && setup.status !== "succeeded" && setup.status !== "canceled") {
      return { clientSecret: setup.client_secret, intentType: "setup" };
    }
    return null;
  }
  if (subscription.status === "incomplete") {
    const secret = invoiceSecretOf(subscription);
    if (secret) return { clientSecret: secret, intentType: "payment" };
  }
  return null;
}

/** Payment types shared by the server subscription and the client Payment Element. */
export const PREMIUM_PAYMENT_METHOD_TYPES = ["card", "link"] as const;

function hasPremiumPaymentMethodTypes(subscription: Stripe.Subscription): boolean {
  const types = subscription.payment_settings?.payment_method_types ?? [];
  return (
    types.length === PREMIUM_PAYMENT_METHOD_TYPES.length &&
    PREMIUM_PAYMENT_METHOD_TYPES.every((t) => types.includes(t))
  );
}

function isUnfinished(subscription: Stripe.Subscription): boolean {
  if (subscription.status === "incomplete") return true;
  return (
    subscription.status === "trialing" &&
    Boolean(subscription.pending_setup_intent) &&
    !subscription.default_payment_method
  );
}

async function findOrCreateJoinCustomer(
  stripe: Stripe,
  input: { userId: string | null; details: JoinDetails; customerId: string | null },
): Promise<Stripe.Customer> {
  const { details, userId } = input;
  const profile: Stripe.CustomerUpdateParams = {
    name: `${details.firstName} ${details.lastName}`,
    ...(details.phone ? { phone: details.phone } : {}),
    ...(userId ? { metadata: { userId, source: PREMIUM_JOIN_SOURCE } } : {}),
  };

  if (input.customerId) {
    try {
      const existing = await stripe.customers.retrieve(input.customerId);
      if (!("deleted" in existing && existing.deleted)) {
        return await stripe.customers.update(existing.id, profile);
      }
    } catch (err) {
      console.warn("[premium] stored customer unavailable, making a new one:", err);
    }
  }

  const list = await stripe.customers.list({ email: details.email, limit: 20 });
  const reusable = list.data.find((customer) => {
    const owner = customer.metadata?.userId?.trim() || "";
    if (userId) return owner === userId || (!owner && customer.metadata?.source === PREMIUM_JOIN_SOURCE);
    // Signed out: only a customer this flow made and no account has claimed.
    return !owner && customer.metadata?.source === PREMIUM_JOIN_SOURCE;
  });
  if (reusable) {
    return stripe.customers.update(reusable.id, profile);
  }

  return stripe.customers.create({
    email: details.email,
    name: profile.name,
    ...(details.phone ? { phone: details.phone } : {}),
    metadata: { source: PREMIUM_JOIN_SOURCE, ...(userId ? { userId } : {}) },
  });
}

/** Any live Premium subscription on this email in the Premium Stripe account. */
export async function emailHasLivePremium(email: string): Promise<boolean> {
  const stripe = getPremiumStripe();
  if (!stripe) return false;
  const customers = await stripe.customers.list({ email, limit: 20 });
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 20 });
    if (
      subs.data.some(
        (sub) =>
          premiumPlanForPrice(subscriptionPriceId(sub)) &&
          (sub.status === "active" || sub.status === "past_due" ||
            (sub.status === "trialing" && !isUnfinished(sub))),
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Create (or reuse) an incomplete Premium subscription for the Payment
 * Element. Price comes from env by plan; the browser never sends an amount.
 * Unfinished attempts on the same customer are reused when they match, and
 * canceled when they don't, so going back and forth never piles them up.
 */
export async function createPremiumSubscription(input: {
  userId: string | null;
  details: JoinDetails;
  plan: PremiumPlan;
  customerId: string | null;
}): Promise<PremiumSubscribeResult> {
  const stripe = getPremiumStripe();
  if (!stripe || !isPremiumCheckoutConfigured()) {
    throw new Error("Membership checkout isn’t available yet.");
  }
  const prices = premiumPriceIds();
  const price = input.plan === "yearly" ? prices.yearly : prices.monthly;
  const trialDays = premiumTrialDays();
  const { details, userId } = input;

  const customer = await findOrCreateJoinCustomer(stripe, input);
  const metadata: Record<string, string> = {
    source: PREMIUM_JOIN_SOURCE,
    plan: input.plan,
    email: details.email,
    ...(userId ? { userId } : {}),
  };

  const existing = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 20,
    expand: ["data.pending_setup_intent", "data.latest_invoice.confirmation_secret"],
  });

  let reuse: Stripe.Subscription | null = null;
  for (const sub of existing.data) {
    const plan = premiumPlanForPrice(subscriptionPriceId(sub));
    if (!plan) continue;
    if (!isUnfinished(sub)) {
      if (
        sub.status === "active" ||
        sub.status === "trialing" ||
        sub.status === "past_due" ||
        sub.status === "unpaid"
      ) {
        return { kind: "already_member" };
      }
      continue;
    }
    const wantsTrial = trialDays > 0;
    const matches =
      !reuse &&
      subscriptionPriceId(sub) === price &&
      (wantsTrial ? sub.status === "trialing" : sub.status === "incomplete") &&
      clientSecretFor(sub) !== null &&
      hasPremiumPaymentMethodTypes(sub);
    if (matches) {
      reuse = sub;
    } else {
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch (err) {
        console.warn("[premium] could not cancel stale subscription:", sub.id, err);
      }
    }
  }

  if (reuse) {
    await stripe.subscriptions.update(reuse.id, { metadata });
    const secret = clientSecretFor(reuse);
    if (secret) return { kind: "ready", subscriptionId: reuse.id, ...secret };
  }

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price, quantity: 1 }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      save_default_payment_method: "on_subscription",
      // Must match the Payment Element's paymentMethodTypes on the client.
      payment_method_types: [...PREMIUM_PAYMENT_METHOD_TYPES],
    },
    metadata,
    ...(trialDays > 0
      ? {
          trial_period_days: trialDays,
          // No saved card by the end of the trial: stop, don't bill.
          trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        }
      : {}),
    expand: ["pending_setup_intent", "latest_invoice.confirmation_secret"],
  });

  const secret = clientSecretFor(subscription);
  if (secret) return { kind: "ready", subscriptionId: subscription.id, ...secret };
  if (subscription.status === "active" || subscription.status === "trialing") {
    return { kind: "complete", subscriptionId: subscription.id };
  }
  throw new Error(`Subscription ${subscription.id} has no payment to confirm.`);
}

/**
 * After the Payment Element confirms: read the subscription back from Stripe
 * (never the browser) and sync membership right away. The webhook repeats
 * the same sync, so a missed call here is harmless.
 */
export async function confirmPremiumSubscription(
  subscriptionId: string,
): Promise<{ sync: SubscriptionSync; subscription: Stripe.Subscription } | null> {
  const stripe = getPremiumStripe();
  if (!stripe) return null;
  let subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["pending_setup_intent"],
  });
  if (subscription.metadata?.source !== PREMIUM_JOIN_SOURCE) return null;
  if (!premiumPlanForPrice(subscriptionPriceId(subscription))) return null;

  const setup = setupIntentOf(subscription);
  if (
    subscription.status === "trialing" &&
    setup?.status === "succeeded" &&
    !subscription.default_payment_method
  ) {
    const paymentMethod =
      typeof setup.payment_method === "string" ? setup.payment_method : setup.payment_method?.id;
    if (paymentMethod) {
      subscription = await stripe.subscriptions.update(subscription.id, {
        default_payment_method: paymentMethod,
        expand: ["pending_setup_intent"],
      });
    }
  }

  // Stripe clears pending_setup_intent once it succeeds. Map with the id only.
  const plain = {
    ...subscription,
    pending_setup_intent:
      setupIntentOf(subscription)?.status === "succeeded"
        ? null
        : subscription.pending_setup_intent,
  };
  const sync = membershipFromSubscription(plain, premiumPriceIds());
  if (!sync) return null;
  return { sync, subscription };
}

export type PremiumChargeAmounts = {
  monthlyCents: number;
  yearlyCents: number;
  currency: string;
};

let amountCache: { key: string; at: number; value: PremiumChargeAmounts } | null = null;
const AMOUNT_TTL_MS = 10 * 60_000;

/**
 * What Stripe will actually charge for each plan, read from the Price
 * objects (cached 10 minutes). Falls back to the display cents env so the
 * page never breaks when Stripe is slow.
 */
export async function premiumChargeAmounts(fallback: {
  monthlyCents: number;
  yearlyCents: number;
}): Promise<PremiumChargeAmounts> {
  const stripe = getPremiumStripe();
  const ids = premiumPriceIds();
  const base = { ...fallback, currency: "usd" };
  if (!stripe || !ids.monthly || !ids.yearly) return base;
  const key = `${ids.monthly}|${ids.yearly}`;
  if (amountCache && amountCache.key === key && Date.now() - amountCache.at < AMOUNT_TTL_MS) {
    return amountCache.value;
  }
  try {
    const [monthly, yearly] = await Promise.all([
      stripe.prices.retrieve(ids.monthly),
      stripe.prices.retrieve(ids.yearly),
    ]);
    const value: PremiumChargeAmounts = {
      monthlyCents: monthly.unit_amount ?? fallback.monthlyCents,
      yearlyCents: yearly.unit_amount ?? fallback.yearlyCents,
      currency: (monthly.currency || "usd").toLowerCase(),
    };
    amountCache = { key, at: Date.now(), value };
    return value;
  } catch (err) {
    console.warn("[premium] price lookup failed, using display prices:", err);
    return base;
  }
}
