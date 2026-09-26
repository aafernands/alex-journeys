/**
 * Alex Journeys transactional email templates. Each returns
 * `{ subject, html, text }` via the branded layout. Wording stays plain and
 * friendly with no technical terms. See docs/EMAILS.md for when each fires.
 */
import { publicSiteOrigin, supportEmailAddress } from "@/lib/email";
import {
  firstNameOf,
  renderEmail,
  type EmailDetail,
  type RenderedEmail,
} from "@/lib/emails/layout";
import { formatMembershipDate, type PremiumPlan } from "@/lib/membership";

export type EmailContext = {
  siteUrl: string;
  supportEmail: string;
  /** Fixed year for tests and screenshots. */
  year?: number;
};

export function defaultEmailContext(): EmailContext {
  return { siteUrl: publicSiteOrigin(), supportEmail: supportEmailAddress() };
}

function ctx(context?: EmailContext): EmailContext {
  return context ?? defaultEmailContext();
}

export function planDisplay(plan: PremiumPlan | null | undefined): string {
  if (plan === "yearly") return "Premium (Yearly)";
  if (plan === "monthly") return "Premium (Monthly)";
  return "Premium";
}

function dateDisplay(iso: string | null | undefined, fallback: string): string {
  return formatMembershipDate(iso ?? null) ?? fallback;
}

function accountNote(c: EmailContext) {
  return [
    "You can update your card, switch plans or cancel anytime from your ",
    { link: "Account settings", href: `${c.siteUrl}/account#membership` },
    ".",
  ];
}

/* ——— Account emails ——— */

export function emailVerificationEmail(
  input: { name?: string | null; code: string; verifyUrl: string; minutes: number },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: "Confirm your email for Alex Journeys",
    preheader: `Your code is ${input.code}. It works for ${input.minutes} minutes.`,
    badge: "✉ Confirm Your Email",
    firstName: firstNameOf(input.name),
    paragraphs: [
      "Welcome to Alex Journeys! Please confirm this is your email address so we know your account is really yours.",
      "Enter this code on the site, or tap the button below:",
    ],
    code: input.code,
    cta: { label: "Confirm my email", url: input.verifyUrl },
    note: `The code and button work for ${input.minutes} minutes. If you didn’t create an account, you can ignore this email.`,
  });
}

export function addPasswordConfirmEmail(
  input: { name?: string | null; confirmUrl: string; minutes: number },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: "Finish adding a password to your Alex Journeys account",
    preheader: "One tap to finish setting your password.",
    badge: "✉ Confirm It’s You",
    firstName: firstNameOf(input.name),
    paragraphs: [
      "Someone asked to add a password to the Alex Journeys account for this email. If that was you, tap the button below to finish. Until then, you can keep signing in with Google as usual.",
    ],
    cta: { label: "Finish setting my password", url: input.confirmUrl },
    note: `This button works for ${input.minutes} minutes. If this wasn’t you, ignore this email and nothing will change.`,
  });
}

export function passwordResetEmail(
  input: { name?: string | null; resetUrl: string },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: "Reset your Alex Journeys password",
    preheader: "Choose a new password. This link works for 1 hour.",
    badge: "🔑 Password Reset",
    firstName: firstNameOf(input.name),
    paragraphs: [
      "We received a request to reset the password for your Alex Journeys account. Tap the button below to choose a new one.",
    ],
    cta: { label: "Choose a new password", url: input.resetUrl },
    note: "This link works for 1 hour. If you didn’t ask for this, you can ignore this email and your password stays the same.",
  });
}

export function emailChangeConfirmEmail(
  input: { name?: string | null; newEmail: string; confirmUrl: string },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: "Confirm your new Alex Journeys email",
    preheader: "One tap to switch your account to this address.",
    badge: "✉ Confirm Your New Email",
    firstName: firstNameOf(input.name),
    paragraphs: [
      ["You asked to use ", { bold: input.newEmail }, " for your Alex Journeys account. Tap the button below to confirm."],
    ],
    cta: { label: "Confirm new email", url: input.confirmUrl },
    note: "This link works for 1 hour. If you didn’t ask for this, you can ignore this email.",
  });
}

export function emailChangeNoticeEmail(
  input: { name?: string | null; newEmail: string },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: "Email change requested on Alex Journeys",
    preheader: "Your current address stays active until the new one is confirmed.",
    badge: "Heads Up: Email Change Requested",
    firstName: firstNameOf(input.name),
    paragraphs: [
      ["Someone asked to change your Alex Journeys account email to ", { bold: input.newEmail }, "."],
      "If that was you, check that inbox and confirm. If it wasn’t, you don’t need to do anything. Your current email stays on the account until the new one is confirmed.",
    ],
    cta: { label: "Review my account", url: `${c.siteUrl}/account` },
  });
}

/* ——— Premium emails (Stripe webhook) ——— */

export type PremiumWelcomeInput = {
  name?: string | null;
  plan: PremiumPlan | null;
  /** e.g. "$9.99" */
  amount: string;
  /** ISO. Set when the membership started with a free trial. */
  trialEnd?: string | null;
  /** ISO. Next renewal (non-trial). */
  nextRenewal?: string | null;
};

export function premiumWelcomeEmail(input: PremiumWelcomeInput, context?: EmailContext): RenderedEmail {
  const c = ctx(context);
  const trial = Boolean(input.trialEnd);
  const trialEnd = dateDisplay(input.trialEnd, "the end of your trial");
  const details: EmailDetail[] = trial
    ? [
        { label: "Membership", value: planDisplay(input.plan) },
        { label: "Free trial ends", value: trialEnd },
        { label: "First charge", value: `${input.amount} on ${trialEnd}` },
      ]
    : [
        { label: "Membership", value: planDisplay(input.plan) },
        { label: "Amount billed", value: input.amount },
        { label: "Next renewal date", value: dateDisplay(input.nextRenewal, "Your next billing date") },
      ];
  return renderEmail({
    ...c,
    subject: trial ? "Your Alex Journeys free trial has started" : "Welcome to Alex Journeys Premium",
    preheader: trial
      ? `Enjoy Premium free until ${trialEnd}.`
      : "Your membership is active. Here’s what’s included.",
    badge: trial ? "✓ Free Trial Started" : "✓ Welcome to Premium",
    firstName: firstNameOf(input.name),
    paragraphs: trial
      ? [
          "Welcome to Premium! Your free trial is on, so member stories, downloadable guides, Lightroom presets, weekly deal notes and the full trip planner are all yours to explore.",
          ["You won’t be charged until your trial ends. We’ll send a reminder a few days before."],
        ]
      : [
          "Welcome to Premium! Thank you for supporting Alex Journeys. Member stories, downloadable guides, Lightroom presets, weekly deal notes and the full trip planner are now open to you.",
        ],
    details,
    cta: { label: "Explore your member perks", url: `${c.siteUrl}/premium/perks` },
    note: accountNote(c),
  });
}

export function trialEndingEmail(
  input: { name?: string | null; plan: PremiumPlan | null; amount: string; trialEnd: string | null },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  const trialEnd = dateDisplay(input.trialEnd, "in a few days");
  return renderEmail({
    ...c,
    subject: "Your Alex Journeys free trial ends soon",
    preheader: `Your trial ends ${trialEnd}. No action needed to stay a member.`,
    badge: "⏳ Your Free Trial Ends Soon",
    firstName: firstNameOf(input.name),
    paragraphs: [
      ["Just a friendly reminder: your Premium free trial ends on ", { bold: trialEnd }, "."],
      "If you’re enjoying it, you don’t need to do anything. Your membership will continue automatically and your card will be charged then.",
    ],
    details: [
      { label: "Membership", value: planDisplay(input.plan) },
      { label: "Trial ends", value: trialEnd },
      { label: "Amount to be billed", value: input.amount },
    ],
    cta: { label: "Review my membership", url: `${c.siteUrl}/account#membership` },
    note: [
      "Not for you? You can cancel before ",
      trialEnd,
      " from your ",
      { link: "Account settings", href: `${c.siteUrl}/account#membership` },
      " and you won’t be charged.",
    ],
  });
}

export function subscriptionRenewedEmail(
  input: { name?: string | null; plan: PremiumPlan | null; amount: string; nextRenewal: string | null },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: "Your Alex Journeys membership has renewed",
    preheader: `Thanks for staying with us. Amount billed: ${input.amount}.`,
    badge: "✓ Subscription Renewed Successfully",
    firstName: firstNameOf(input.name),
    paragraphs: [
      ["Thank you for traveling with Alex Journeys! Your ", { bold: planDisplay(input.plan) }, " membership has renewed, so all your member perks stay open."],
    ],
    details: [
      { label: "Membership", value: planDisplay(input.plan) },
      { label: "Amount billed", value: input.amount },
      { label: "Next renewal date", value: dateDisplay(input.nextRenewal, "Your next billing date") },
    ],
    cta: { label: "Continue exploring", url: `${c.siteUrl}/premium/perks` },
    note: [
      "You can view receipts, update your card or manage billing anytime from your ",
      { link: "Account settings", href: `${c.siteUrl}/account#membership` },
      ".",
    ],
  });
}

export function paymentFailedEmail(
  input: { name?: string | null; plan: PremiumPlan | null; amount: string; nextAttempt?: string | null },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  const details: EmailDetail[] = [
    { label: "Membership", value: planDisplay(input.plan) },
    { label: "Amount due", value: input.amount },
  ];
  const retry = formatMembershipDate(input.nextAttempt ?? null);
  if (retry) details.push({ label: "We’ll try again on", value: retry });
  return renderEmail({
    ...c,
    subject: "Action needed: your Alex Journeys payment didn’t go through",
    preheader: "Please update your card to keep your Premium perks.",
    badge: "⚠ Payment Didn’t Go Through",
    firstName: firstNameOf(input.name),
    paragraphs: [
      "We tried to renew your Premium membership, but the payment didn’t go through. This often happens when a card expires or the bank declines the charge.",
      "Please update your payment details so your member perks stay open.",
    ],
    details,
    cta: { label: "Update payment method", url: `${c.siteUrl}/account#membership` },
    note: "Already fixed it? Thank you! You can ignore this email.",
  });
}

export function subscriptionCanceledEmail(
  input: { name?: string | null; plan: PremiumPlan | null; accessUntil: string | null; ended: boolean },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  const until = dateDisplay(input.accessUntil, input.ended ? "today" : "the end of your billing period");
  return renderEmail({
    ...c,
    subject: input.ended
      ? "Your Alex Journeys membership has ended"
      : "Your Alex Journeys membership has been canceled",
    preheader: input.ended
      ? "Thanks for being a member. You’re welcome back anytime."
      : `You keep your Premium perks until ${until}.`,
    badge: input.ended ? "Membership Ended" : "Membership Canceled",
    firstName: firstNameOf(input.name),
    paragraphs: input.ended
      ? [
          "Your Premium membership has ended. Thank you for being part of Alex Journeys. Your account, saved stories and trips are still here for you.",
        ]
      : [
          ["Your Premium membership has been canceled. You’ll keep all your member perks until ", { bold: until }, ", and you won’t be charged again."],
        ],
    details: [
      { label: "Membership", value: planDisplay(input.plan) },
      { label: input.ended ? "Access ended" : "Access until", value: until },
    ],
    cta: input.ended
      ? { label: "Rejoin Premium", url: `${c.siteUrl}/premium/join` }
      : { label: "Keep my membership", url: `${c.siteUrl}/account#membership` },
    note: input.ended
      ? "Changed your mind? You can rejoin anytime and pick up right where you left off."
      : ["Changed your mind? You can turn renewal back on from your ", { link: "Account settings", href: `${c.siteUrl}/account#membership` }, " before that date."],
  });
}
