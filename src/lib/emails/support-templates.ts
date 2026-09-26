/**
 * Support ticket emails (same branded layout as every other email).
 * Customer emails carry the ticket number in the subject so replies thread
 * back to the right ticket (see support-tickets.ts extractTicketNumber).
 */
import { firstNameOf, renderEmail, type RenderedEmail } from "@/lib/emails/layout";
import { defaultEmailContext, type EmailContext } from "@/lib/emails/templates";
import { ticketEmailSubject } from "@/lib/support-tickets";

function ctx(context?: EmailContext): EmailContext {
  return context ?? defaultEmailContext();
}

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

export type TicketEmailInput = {
  name: string | null;
  ticketNumber: string;
  subject: string;
};

/** To the reader right after they send the Help/Contact form. */
export function ticketReceivedEmail(
  input: TicketEmailInput & { topic: string; message: string; createdAt: string },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: ticketEmailSubject("We got your message", input.ticketNumber),
    preheader: `Thanks for reaching out. Your reference number is ${input.ticketNumber}.`,
    badge: "✓ Message Received",
    firstName: firstNameOf(input.name),
    paragraphs: [
      "Thanks for getting in touch! We’ve received your message and will get back to you as soon as we can, usually within a couple of days.",
    ],
    details: [
      { label: "Reference number", value: input.ticketNumber },
      { label: "Topic", value: input.topic },
      { label: "Subject", value: input.subject },
      { label: "Received", value: when(input.createdAt) },
    ],
    quote: { label: "Your message", body: input.message },
    note: "Want to add something? Just reply to this email and keep the reference number in the subject line.",
  });
}

/** To the reader when the team replies from the CMS. */
export function ticketReplyEmail(
  input: TicketEmailInput & { reply: string; authorName: string | null; closed: boolean },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: ticketEmailSubject(`Re: ${input.subject}`, input.ticketNumber),
    preheader: input.reply.replace(/\s+/g, " ").slice(0, 120),
    badge: "💬 New Reply to Your Message",
    firstName: firstNameOf(input.name),
    paragraphs: [
      input.closed
        ? "Here’s our reply to your message. We’ve marked it as resolved, but if you still need help just reply to this email and we’ll pick it back up."
        : "Here’s our reply to your message:",
    ],
    quote: { label: input.authorName ? `From ${input.authorName}` : "Our reply", body: input.reply },
    details: [{ label: "Reference number", value: input.ticketNumber }],
    note: "To answer, just reply to this email.",
  });
}

/** To the reader when the ticket is closed without a new reply. */
export function ticketClosedEmail(input: TicketEmailInput, context?: EmailContext): RenderedEmail {
  const c = ctx(context);
  return renderEmail({
    ...c,
    subject: ticketEmailSubject("Your request is resolved", input.ticketNumber),
    preheader: "Still need help? Just reply and we’ll reopen it.",
    badge: "✓ Request Resolved",
    firstName: firstNameOf(input.name),
    paragraphs: [
      ["We’ve marked your request ", { bold: `“${input.subject}”` }, " as resolved. Thanks for reaching out to Alex Journeys!"],
      "If anything is still unclear, just reply to this email and we’ll pick it back up.",
    ],
    details: [{ label: "Reference number", value: input.ticketNumber }],
    cta: { label: "Keep exploring", url: c.siteUrl },
  });
}

/** To the support inbox: a new ticket or a new reply from the reader. */
export function staffTicketAlertEmail(
  input: TicketEmailInput & {
    kind: "new" | "reply";
    email: string;
    topic: string;
    message: string;
    cmsUrl: string;
  },
  context?: EmailContext,
): RenderedEmail {
  const c = ctx(context);
  const isNew = input.kind === "new";
  return renderEmail({
    ...c,
    subject: `${isNew ? "New support request" : "New reply"}: ${input.subject} [${input.ticketNumber}]`,
    preheader: `${input.name ?? input.email}: ${input.message.replace(/\s+/g, " ").slice(0, 100)}`,
    badge: isNew ? "📥 New Support Request" : "📥 Reader Replied",
    firstName: "Alex",
    paragraphs: [
      isNew
        ? "A reader just sent a message from the Help & Contact form."
        : "A reader replied to their support request.",
    ],
    details: [
      { label: "Reference number", value: input.ticketNumber },
      { label: "From", value: input.name ? `${input.name} (${input.email})` : input.email },
      { label: "Topic", value: input.topic },
      { label: "Subject", value: input.subject },
    ],
    quote: { label: "Message", body: input.message },
    cta: { label: "Open in the CMS", url: input.cmsUrl },
    note: "Reply from the CMS so the reader gets a branded email and the conversation stays in one place.",
  });
}
