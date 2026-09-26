/**
 * Sample data for every template. Used by the CMS email preview
 * (/cms/emails) and scripts/render-emails.mjs for screenshots.
 */
import type { RenderedEmail } from "@/lib/emails/layout";
import {
  addPasswordConfirmEmail,
  emailChangeConfirmEmail,
  emailChangeNoticeEmail,
  emailVerificationEmail,
  paymentFailedEmail,
  passwordResetEmail,
  premiumWelcomeEmail,
  subscriptionCanceledEmail,
  subscriptionRenewedEmail,
  trialEndingEmail,
  type EmailContext,
} from "@/lib/emails/templates";
import {
  staffTicketAlertEmail,
  ticketClosedEmail,
  ticketReceivedEmail,
  ticketReplyEmail,
} from "@/lib/emails/support-templates";

export type EmailSample = {
  id: string;
  label: string;
  when: string;
  render: (context: EmailContext) => RenderedEmail;
};

const NAME = "Maria Lopez";

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export const EMAIL_SAMPLES: EmailSample[] = [
  {
    id: "verify-email",
    label: "Confirm your email",
    when: "Right after someone signs up with email and password, or asks for a new code.",
    render: (c) =>
      emailVerificationEmail(
        { name: NAME, code: "482913", verifyUrl: `${c.siteUrl}/verify-email?uid=sample&token=sample`, minutes: 30 },
        c,
      ),
  },
  {
    id: "add-password",
    label: "Finish adding a password",
    when: "When someone signs up with email and password for an email that already has a Google account.",
    render: (c) =>
      addPasswordConfirmEmail({ name: NAME, confirmUrl: `${c.siteUrl}/verify-email?uid=sample&token=sample`, minutes: 30 }, c),
  },
  {
    id: "password-reset",
    label: "Password reset",
    when: "Forgot password, or Send reset link on CMS → Users.",
    render: (c) => passwordResetEmail({ name: NAME, resetUrl: `${c.siteUrl}/reset-password?token=sample` }, c),
  },
  {
    id: "email-change-confirm",
    label: "Confirm new email",
    when: "Sent to the new address when a reader changes their account email.",
    render: (c) =>
      emailChangeConfirmEmail(
        { name: NAME, newEmail: "maria.new@example.com", confirmUrl: `${c.siteUrl}/account/confirm-email?token=sample` },
        c,
      ),
  },
  {
    id: "email-change-notice",
    label: "Email change heads-up",
    when: "Sent to the old address when a reader asks to change their account email.",
    render: (c) => emailChangeNoticeEmail({ name: NAME, newEmail: "maria.new@example.com" }, c),
  },
  {
    id: "premium-trial-started",
    label: "Premium: free trial started",
    when: "First time a Premium subscription becomes active with a free trial.",
    render: (c) => premiumWelcomeEmail({ name: NAME, plan: "monthly", amount: "$9.99", trialEnd: isoDaysFromNow(7) }, c),
  },
  {
    id: "premium-welcome",
    label: "Premium: welcome (no trial)",
    when: "First time a Premium subscription becomes active without a trial.",
    render: (c) => premiumWelcomeEmail({ name: NAME, plan: "yearly", amount: "$99", nextRenewal: isoDaysFromNow(365) }, c),
  },
  {
    id: "trial-ending",
    label: "Premium: trial ending soon",
    when: "Stripe customer.subscription.trial_will_end (3 days before the trial ends).",
    render: (c) => trialEndingEmail({ name: NAME, plan: "monthly", amount: "$9.99", trialEnd: isoDaysFromNow(3) }, c),
  },
  {
    id: "subscription-renewed",
    label: "Premium: renewed",
    when: "Stripe invoice.paid for a renewal (billing_reason subscription_cycle).",
    render: (c) =>
      subscriptionRenewedEmail({ name: NAME, plan: "monthly", amount: "$9.99", nextRenewal: isoDaysFromNow(30) }, c),
  },
  {
    id: "payment-failed",
    label: "Premium: payment failed",
    when: "Stripe invoice.payment_failed.",
    render: (c) => paymentFailedEmail({ name: NAME, plan: "monthly", amount: "$9.99", nextAttempt: isoDaysFromNow(3) }, c),
  },
  {
    id: "subscription-canceled",
    label: "Premium: canceled (access until)",
    when: "A member turns off renewal (cancel at period end).",
    render: (c) =>
      subscriptionCanceledEmail({ name: NAME, plan: "monthly", accessUntil: isoDaysFromNow(18), ended: false }, c),
  },
  {
    id: "subscription-ended",
    label: "Premium: membership ended",
    when: "Stripe customer.subscription.deleted, when no cancel email was sent earlier.",
    render: (c) =>
      subscriptionCanceledEmail({ name: NAME, plan: "monthly", accessUntil: new Date().toISOString(), ended: true }, c),
  },
  {
    id: "ticket-received",
    label: "Support: message received",
    when: "Right after a reader sends the Help & Contact form.",
    render: (c) =>
      ticketReceivedEmail(
        {
          name: NAME,
          ticketNumber: "AJ-2026-482913",
          topic: "Premium membership or billing",
          subject: "Question about my yearly plan",
          message: "Hi! I signed up for the yearly plan last week.\nCan I switch to monthly when it renews?",
          createdAt: new Date().toISOString(),
        },
        c,
      ),
  },
  {
    id: "ticket-reply",
    label: "Support: reply from the team",
    when: "When you reply to a ticket from CMS → Support.",
    render: (c) =>
      ticketReplyEmail(
        {
          name: NAME,
          ticketNumber: "AJ-2026-482913",
          subject: "Question about my yearly plan",
          reply:
            "Hi Maria,\n\nYes, you can! Open Account → Membership → Manage membership and pick Monthly. The change starts at your next renewal.\n\nHappy travels,\nAlex",
          authorName: "Alex",
          closed: false,
        },
        c,
      ),
  },
  {
    id: "ticket-closed",
    label: "Support: request resolved",
    when: "When you close a ticket from CMS → Support without writing a reply.",
    render: (c) =>
      ticketClosedEmail({ name: NAME, ticketNumber: "AJ-2026-482913", subject: "Question about my yearly plan" }, c),
  },
  {
    id: "ticket-staff-alert",
    label: "Support: alert to the support inbox",
    when: "To SUPPORT_NOTIFY_EMAIL for every new request and every reader reply.",
    render: (c) =>
      staffTicketAlertEmail(
        {
          kind: "new",
          name: NAME,
          email: "maria@example.com",
          ticketNumber: "AJ-2026-482913",
          topic: "Premium membership or billing",
          subject: "Question about my yearly plan",
          message: "Hi! I signed up for the yearly plan last week.\nCan I switch to monthly when it renews?",
          cmsUrl: `${c.siteUrl}/cms/support/AJ-2026-482913`,
        },
        c,
      ),
  },
];

export function findEmailSample(id: string): EmailSample | null {
  return EMAIL_SAMPLES.find((s) => s.id === id) ?? null;
}
