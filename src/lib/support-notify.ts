/**
 * Support ticket emails. Never throws; returns the send status.
 *
 * Env:
 * - SUPPORT_INBOUND_EMAIL: reply-to on reader emails, e.g.
 *   support@inbound.alexjourneys.com. When set (and Resend inbound is on for
 *   that domain), reader replies land back on the ticket automatically.
 *   Falls back to EMAIL_REPLY_TO / SUPPORT_EMAIL (replies then arrive in that
 *   inbox and are not threaded onto the ticket).
 * - SUPPORT_NOTIFY_EMAIL: where new-ticket / reader-reply alerts go.
 *   Defaults to SUPPORT_EMAIL.
 */
import {
  emailReplyToAddress,
  publicSiteOrigin,
  sendEmailSafe,
  supportEmailAddress,
  type SafeSendResult,
} from "@/lib/email";
import {
  staffTicketAlertEmail,
  ticketClosedEmail,
  ticketReceivedEmail,
  ticketReplyEmail,
} from "@/lib/emails/support-templates";
import { parseEmailAddress, type SupportTicket } from "@/lib/support-tickets";

export function supportInboundAddress(): string | null {
  return parseEmailAddress(process.env.SUPPORT_INBOUND_EMAIL);
}

export function supportReplyToAddress(): string {
  return process.env.SUPPORT_INBOUND_EMAIL?.trim() || emailReplyToAddress();
}

export function supportNotifyAddress(): string {
  return process.env.SUPPORT_NOTIFY_EMAIL?.trim() || supportEmailAddress();
}

/** True when an inbound email was sent to the support reply address. */
export function isSupportInboundRecipient(recipients: readonly string[]): boolean {
  const inbound = supportInboundAddress();
  if (!inbound) return false;
  return recipients.some((r) => parseEmailAddress(r) === inbound);
}

function cmsUrl(ticket: SupportTicket): string {
  return `${publicSiteOrigin()}/cms/support/${encodeURIComponent(ticket.ticketNumber)}`;
}

export async function notifyTicketCreated(
  ticket: SupportTicket,
  message: string,
): Promise<{ customer: SafeSendResult; staff: SafeSendResult }> {
  const customer = await sendEmailSafe(
    {
      to: ticket.email,
      replyTo: supportReplyToAddress(),
      ...ticketReceivedEmail({
        name: ticket.name,
        ticketNumber: ticket.ticketNumber,
        topic: ticket.topic,
        subject: ticket.subject,
        message,
        createdAt: ticket.createdAt,
      }),
    },
    "support ticket received",
  );
  const staff = await notifyStaff(ticket, "new", message);
  return { customer, staff };
}

export async function notifyStaff(
  ticket: SupportTicket,
  kind: "new" | "reply",
  message: string,
): Promise<SafeSendResult> {
  return sendEmailSafe(
    {
      to: supportNotifyAddress(),
      replyTo: ticket.email,
      ...staffTicketAlertEmail({
        kind,
        name: ticket.name,
        email: ticket.email,
        ticketNumber: ticket.ticketNumber,
        topic: ticket.topic,
        subject: ticket.subject,
        message,
        cmsUrl: cmsUrl(ticket),
      }),
    },
    `support staff alert (${kind})`,
  );
}

export async function notifyStaffReply(
  ticket: SupportTicket,
  reply: string,
  authorName: string | null,
): Promise<SafeSendResult> {
  return sendEmailSafe(
    {
      to: ticket.email,
      replyTo: supportReplyToAddress(),
      ...ticketReplyEmail({
        name: ticket.name,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        reply,
        authorName,
        closed: ticket.status === "closed",
      }),
    },
    "support reply",
  );
}

export async function notifyTicketClosed(ticket: SupportTicket): Promise<SafeSendResult> {
  return sendEmailSafe(
    {
      to: ticket.email,
      replyTo: supportReplyToAddress(),
      ...ticketClosedEmail({ name: ticket.name, ticketNumber: ticket.ticketNumber, subject: ticket.subject }),
    },
    "support closed",
  );
}
