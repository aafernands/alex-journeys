/**
 * Support tickets: shared types and pure helpers (safe for client imports).
 * Firestore lives in support-store.ts, emails in support-notify.ts.
 * Modeled on the Nurse Intensive support desk (ticket numbers in subjects,
 * confirmation + reply emails, inbound email replies, admin inbox).
 */

export const TICKET_STATUSES = ["open", "in_progress", "waiting", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting on reader",
  closed: "Closed",
};

export const SUPPORT_TOPICS = [
  "General question",
  "Premium membership or billing",
  "My account or sign-in",
  "Trip planner",
  "Something isn’t working",
  "Partnerships and media",
] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export type TicketMessageDirection = "customer" | "staff";
/** form = contact form, email = emailed reply, cms = Alex in the CMS, site = reader replied from My Journey → Help. */
export type TicketMessageChannel = "form" | "email" | "cms" | "site";

export type TicketMessage = {
  id: string;
  direction: TicketMessageDirection;
  channel: TicketMessageChannel;
  authorName: string | null;
  body: string;
  createdAt: string;
  /** Resend email id for inbound replies (dedupe). */
  providerMessageId?: string | null;
  /** Whether the email for a staff reply went out. */
  emailStatus?: "sent" | "skipped" | "failed" | null;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  name: string;
  email: string;
  userId: string | null;
  topic: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  messageCount: number;
  unreadForStaff: boolean;
  closedAt: string | null;
};

export const LIMITS = {
  name: 80,
  subject: 150,
  message: 5000,
  reply: 10000,
} as const;

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && (TICKET_STATUSES as readonly string[]).includes(value);
}

/** Human-readable, e.g. AJ-2026-482913. */
export function generateTicketNumber(now: Date = new Date(), random: () => number = Math.random): string {
  const digits = String(Math.floor(100000 + random() * 900000));
  return `AJ-${now.getUTCFullYear()}-${digits}`;
}

const TICKET_NUMBER_RE = /\b(AJ-\d{4}-\d{6})\b/i;

export function isTicketNumber(value: unknown): value is string {
  return typeof value === "string" && /^AJ-\d{4}-\d{6}$/.test(value);
}

/** Pull "AJ-2026-482913" out of an email subject like "Re: … [AJ-2026-482913]". */
export function extractTicketNumber(subject: string | null | undefined): string | null {
  const match = (subject ?? "").match(TICKET_NUMBER_RE);
  return match?.[1] ? match[1].toUpperCase() : null;
}

/** Subject line for every customer email about a ticket. */
export function ticketEmailSubject(prefix: string, ticketNumber: string): string {
  return `${prefix} [${ticketNumber}]`;
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type NewTicketInput = {
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
};

export function validateNewTicket(
  raw: Record<string, unknown>,
): { ok: true; value: NewTicketInput } | { ok: false; error: string } {
  const name = clean(raw.name, LIMITS.name);
  const email = clean(raw.email, 254).toLowerCase();
  const topicRaw = clean(raw.topic, 80);
  const topic = (SUPPORT_TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : SUPPORT_TOPICS[0];
  const message = typeof raw.message === "string" ? raw.message.replace(/\u0000/g, "").trim() : "";
  if (!name) return { ok: false, error: "Please add your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (message.length < 10) return { ok: false, error: "Please tell us a little more (at least a sentence)." };
  if (message.length > LIMITS.message) {
    return { ok: false, error: `Please keep your message under ${LIMITS.message.toLocaleString("en-US")} characters.` };
  }
  const subject = clean(raw.subject, LIMITS.subject) || topic;
  return { ok: true, value: { name, email, topic, subject, message } };
}

export function previewOf(body: string, max = 140): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Keep only the new part of an emailed reply: drop quoted lines and
 * everything after common "On … wrote:" / "Original Message" markers.
 */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (/^On .+wrote:$/i.test(trimmed)) break;
    if (/^On .+/i.test(trimmed) && /wrote:$/i.test((lines[i + 1] ?? "").trim())) break;
    if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(trimmed)) break;
    if (/^_{5,}$/.test(trimmed)) break;
    if (/^From:\s.+/i.test(trimmed) && out.length > 0 && /^(Sent|Date):\s/i.test((lines[i + 1] ?? "").trim())) break;
    if (trimmed.startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Very small HTML → text fallback for inbound mail with no text part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "Maria <maria@x.com>" → "maria@x.com". */
export function parseEmailAddress(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  const angle = value.match(/<([^>]+)>/);
  const email = (angle?.[1] ?? value).trim().toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

/** Status after a new message. Customer mail reopens; staff reply waits on the reader. */
export function statusAfterMessage(
  current: TicketStatus,
  direction: TicketMessageDirection,
  closeAfterReply = false,
): TicketStatus {
  if (direction === "customer") return "open";
  void current;
  return closeAfterReply ? "closed" : "waiting";
}

/* ------------------------------------------------------------------ */
/* Reader view (My Journey → Help). Only these fields leave the server. */
/* ------------------------------------------------------------------ */

export type ReaderTicketStatus = "active" | "waiting" | "resolved";

export const READER_STATUS_LABELS: Record<ReaderTicketStatus, string> = {
  active: "We’re on it",
  waiting: "Replied — waiting on you",
  resolved: "Resolved",
};

export function readerStatus(status: TicketStatus): ReaderTicketStatus {
  if (status === "closed") return "resolved";
  if (status === "waiting") return "waiting";
  return "active";
}

export type ReaderTicket = {
  ticketNumber: string;
  subject: string;
  topic: string;
  status: ReaderTicketStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReaderTicketMessage = {
  id: string;
  fromReader: boolean;
  /** Staff replies: who signed it. Reader messages: null. */
  authorName: string | null;
  body: string;
  createdAt: string;
};

export function toReaderTicket(ticket: SupportTicket): ReaderTicket {
  return {
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject || ticket.topic,
    topic: ticket.topic,
    status: readerStatus(ticket.status),
    createdAt: ticket.createdAt,
    updatedAt: ticket.lastMessageAt || ticket.updatedAt,
  };
}

export function toReaderMessage(message: TicketMessage): ReaderTicketMessage {
  const fromReader = message.direction === "customer";
  return {
    id: message.id,
    fromReader,
    authorName: fromReader ? null : message.authorName?.trim() || "Alex",
    body: message.body,
    createdAt: message.createdAt,
  };
}

/**
 * May this signed-in reader see the ticket? Their own account id always
 * matches. The email only counts when the account email is verified, so a
 * request sent while signed out shows up once they confirm that address.
 */
export function readerOwnsTicket(
  ticket: Pick<SupportTicket, "userId" | "email">,
  reader: { userId: string; email: string | null; emailVerified: boolean },
): boolean {
  if (ticket.userId && ticket.userId === reader.userId) return true;
  const email = reader.email?.trim().toLowerCase();
  if (!reader.emailVerified || !email) return false;
  return ticket.email.trim().toLowerCase() === email;
}

/** Newest activity first. */
export function sortByLatest<T extends { lastMessageAt: string; updatedAt: string }>(rows: T[]): T[] {
  const at = (t: T) => t.lastMessageAt || t.updatedAt || "";
  return [...rows].sort((a, b) => (at(a) < at(b) ? 1 : at(a) > at(b) ? -1 : 0));
}

export function validateReaderReply(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const body = typeof raw === "string" ? raw.replace(/\u0000/g, "").trim() : "";
  if (body.length < 2) return { ok: false, error: "Please write a short message first." };
  if (body.length > LIMITS.message) {
    return { ok: false, error: `Please keep your message under ${LIMITS.message.toLocaleString("en-US")} characters.` };
  }
  return { ok: true, body };
}
