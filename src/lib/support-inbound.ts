/**
 * Reader replies to support emails (Resend inbound → /api/inbound/email).
 * Only mail sent to SUPPORT_INBOUND_EMAIL is routed here. The ticket number
 * comes from the subject, and the sender must match the ticket email, so a
 * stranger cannot post into someone else's ticket.
 */
import { notifyStaff } from "@/lib/support-notify";
import { addCustomerEmailReply, getTicket } from "@/lib/support-store";
import {
  extractTicketNumber,
  htmlToText,
  LIMITS,
  parseEmailAddress,
  stripQuotedReply,
} from "@/lib/support-tickets";

export type SupportInboundResult =
  | { stored: true; ticketNumber: string }
  | { stored: false; ignored: "no_ticket_number" | "unknown_ticket" | "sender_mismatch" | "empty" | "duplicate" };

export async function ingestSupportReply(input: {
  emailId: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SupportInboundResult> {
  const ticketNumber = extractTicketNumber(input.subject);
  if (!ticketNumber) return { stored: false, ignored: "no_ticket_number" };
  const found = await getTicket(ticketNumber);
  if (!found) return { stored: false, ignored: "unknown_ticket" };
  const sender = parseEmailAddress(input.from);
  if (!sender || sender !== found.ticket.email.toLowerCase()) {
    console.warn("[support] inbound reply sender does not match ticket:", ticketNumber);
    return { stored: false, ignored: "sender_mismatch" };
  }
  const raw = input.text.trim() ? input.text : htmlToText(input.html);
  const body = stripQuotedReply(raw).slice(0, LIMITS.reply);
  if (!body) return { stored: false, ignored: "empty" };
  const nameMatch = input.from.match(/^\s*"?([^"<]+?)"?\s*</);
  const saved = await addCustomerEmailReply(ticketNumber, {
    body,
    providerMessageId: input.emailId,
    authorName: nameMatch?.[1]?.trim() || null,
  });
  if (!saved) return { stored: false, ignored: "unknown_ticket" };
  if (saved.duplicate) return { stored: false, ignored: "duplicate" };
  await notifyStaff(saved.ticket, "reply", body);
  return { stored: true, ticketNumber };
}
