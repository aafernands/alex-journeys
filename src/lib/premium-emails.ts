/**
 * Sends Premium emails planned by premium-email-events.ts, at most once per
 * key. Sent keys live in Firestore `emailSends/{sha256(key)}` with the
 * Stripe event id, so webhook retries never double-send. Never throws: a
 * mail problem must not fail the webhook (which would make Stripe retry the
 * membership update).
 */
import { createHash } from "node:crypto";
import { sendEmailSafe } from "@/lib/email";
import type { RenderedEmail } from "@/lib/emails/layout";
import {
  paymentFailedEmail,
  premiumWelcomeEmail,
  subscriptionCanceledEmail,
  subscriptionRenewedEmail,
  trialEndingEmail,
} from "@/lib/emails/templates";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import type { MembershipTarget } from "@/lib/membership-store";
import type { PremiumEmailPlan } from "@/lib/premium-email-events";
import { getUserById } from "@/lib/users";

const COLLECTION = "emailSends";

export function renderPremiumEmail(plan: PremiumEmailPlan, name: string | null): RenderedEmail {
  switch (plan.kind) {
    case "welcome":
      return premiumWelcomeEmail({ name, plan: plan.plan, amount: plan.amount, trialEnd: plan.trialEnd, nextRenewal: plan.nextRenewal });
    case "trial-ending":
      return trialEndingEmail({ name, plan: plan.plan, amount: plan.amount, trialEnd: plan.trialEnd });
    case "renewed":
      return subscriptionRenewedEmail({ name, plan: plan.plan, amount: plan.amount, nextRenewal: plan.nextRenewal });
    case "payment-failed":
      return paymentFailedEmail({ name, plan: plan.plan, amount: plan.amount, nextAttempt: plan.nextAttempt });
    case "canceled":
      return subscriptionCanceledEmail({ name, plan: plan.plan, accessUntil: plan.accessUntil, ended: plan.ended });
  }
}

type Recipient = { email: string; name: string | null };

async function recipientFor(
  target: MembershipTarget,
  customerId: string | null,
): Promise<Recipient | null> {
  if (target.kind === "user") {
    const user = await getUserById(target.userId);
    if (user?.email && !user.disabled) return { email: user.email, name: user.name };
  } else if (target.email) {
    return { email: target.email, name: await stripeCustomerName(customerId) };
  }
  // Account without an email (e.g. X): fall back to the Stripe customer.
  if (!customerId) return null;
  try {
    const { getPremiumStripe } = await import("@/lib/stripe-premium");
    const stripe = getPremiumStripe();
    if (!stripe) return null;
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
    return email ? { email, name: customer.name ?? null } : null;
  } catch (err) {
    console.warn("[premium-emails] customer lookup failed:", err);
    return null;
  }
}

async function stripeCustomerName(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  try {
    const { getPremiumStripe } = await import("@/lib/stripe-premium");
    const stripe = getPremiumStripe();
    if (!stripe) return null;
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) return null;
    return customer.name ?? null;
  } catch {
    return null;
  }
}

function sendsCollection() {
  if (!isFirebaseConfigured()) return null;
  return getFirestoreDb()?.collection(COLLECTION) ?? null;
}

export function emailSendDocId(key: string): string {
  return createHash("sha256").update(`email-send:${key}`).digest("hex");
}

function isAlreadyExists(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

/**
 * Send each planned email once. Claims the key first (create fails if it
 * exists), sends, then records the result. A failed send releases the
 * claim so the next Stripe retry can try again.
 */
export async function sendPremiumEmails(input: {
  plans: PremiumEmailPlan[];
  target: MembershipTarget | null;
  customerId: string | null;
  eventId: string;
  eventType: string;
}): Promise<void> {
  if (!input.plans.length || !input.target) return;
  const sends = sendsCollection();
  if (!sends) return;
  let recipient: Recipient | null | undefined;
  for (const plan of input.plans) {
    const ref = sends.doc(emailSendDocId(plan.key));
    try {
      await ref.create({
        key: plan.key,
        kind: plan.kind,
        eventId: input.eventId,
        eventType: input.eventType,
        status: "sending",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if (isAlreadyExists(err)) continue;
      console.error("[premium-emails] could not record send:", plan.key, err);
      continue;
    }
    try {
      if (recipient === undefined) recipient = await recipientFor(input.target, input.customerId);
      if (!recipient) {
        await ref.set({ status: "no_recipient" }, { merge: true });
        continue;
      }
      const message = renderPremiumEmail(plan, recipient.name);
      const result = await sendEmailSafe({ to: recipient.email, ...message }, `premium ${plan.kind}`);
      if (result.status === "failed") {
        await ref.delete();
      } else {
        await ref.set({ status: result.status, sentAt: new Date().toISOString() }, { merge: true });
      }
    } catch (err) {
      console.error("[premium-emails] send failed:", plan.key, err);
      await ref.delete().catch(() => undefined);
    }
  }
}
