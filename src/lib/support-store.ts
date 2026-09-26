/**
 * Support tickets in Firestore (server only).
 *
 * - `supportTickets/{ticketNumber}`: SupportTicket fields (doc id is the
 *   human-readable number, e.g. AJ-2026-482913, so it is unique by create()).
 * - `supportTickets/{ticketNumber}/messages/{id}`: TicketMessage.
 *
 * Listing reads the latest 300 by updatedAt and filters in memory, so no
 * composite index is needed.
 */
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  generateTicketNumber,
  isTicketNumber,
  isTicketStatus,
  previewOf,
  sortByLatest,
  statusAfterMessage,
  type NewTicketInput,
  type SupportTicket,
  type TicketMessage,
  type TicketMessageChannel,
  type TicketStatus,
} from "@/lib/support-tickets";

export class SupportUnavailableError extends Error {
  constructor(message = "Support isn’t available right now.") {
    super(message);
    this.name = "SupportUnavailableError";
  }
}

function db() {
  if (!isFirebaseConfigured()) throw new SupportUnavailableError();
  const firestore = getFirestoreDb();
  if (!firestore) throw new SupportUnavailableError();
  return firestore;
}

function tickets() {
  return db().collection("supportTickets");
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toTicket(id: string, data: Record<string, unknown>): SupportTicket {
  return {
    id,
    ticketNumber: str(data.ticketNumber, id),
    name: str(data.name),
    email: str(data.email),
    userId: typeof data.userId === "string" && data.userId ? data.userId : null,
    topic: str(data.topic),
    subject: str(data.subject),
    status: isTicketStatus(data.status) ? data.status : "open",
    createdAt: str(data.createdAt),
    updatedAt: str(data.updatedAt),
    lastMessageAt: str(data.lastMessageAt, str(data.updatedAt)),
    lastMessagePreview: str(data.lastMessagePreview),
    messageCount: typeof data.messageCount === "number" ? data.messageCount : 0,
    unreadForStaff: data.unreadForStaff === true,
    closedAt: typeof data.closedAt === "string" ? data.closedAt : null,
  };
}

function toMessage(id: string, data: Record<string, unknown>): TicketMessage {
  const direction = data.direction === "staff" ? "staff" : "customer";
  const channel: TicketMessageChannel =
    data.channel === "email" || data.channel === "cms" || data.channel === "site" ? data.channel : "form";
  const emailStatus =
    data.emailStatus === "sent" || data.emailStatus === "skipped" || data.emailStatus === "failed"
      ? data.emailStatus
      : null;
  return {
    id,
    direction,
    channel,
    authorName: typeof data.authorName === "string" ? data.authorName : null,
    body: str(data.body),
    createdAt: str(data.createdAt),
    providerMessageId: typeof data.providerMessageId === "string" ? data.providerMessageId : null,
    emailStatus,
  };
}

function isAlreadyExists(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

export async function createTicket(
  input: NewTicketInput & { userId: string | null },
): Promise<{ ticket: SupportTicket; message: TicketMessage }> {
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketNumber = generateTicketNumber();
    const ref = tickets().doc(ticketNumber);
    const data = {
      ticketNumber,
      name: input.name,
      email: input.email,
      userId: input.userId,
      topic: input.topic,
      subject: input.subject,
      status: "open" as TicketStatus,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      lastMessagePreview: previewOf(input.message),
      messageCount: 1,
      unreadForStaff: true,
      closedAt: null,
      source: "contact_form",
    };
    try {
      await ref.create(data);
    } catch (err) {
      if (isAlreadyExists(err)) continue;
      throw err;
    }
    const msgRef = ref.collection("messages").doc();
    const message = {
      direction: "customer",
      channel: "form",
      authorName: input.name,
      body: input.message,
      createdAt: now,
    };
    await msgRef.set(message);
    return { ticket: toTicket(ticketNumber, data), message: toMessage(msgRef.id, message) };
  }
  throw new Error("Could not create a ticket number.");
}

export async function listTickets(filter: {
  status?: TicketStatus | "all" | "active";
  query?: string;
} = {}): Promise<SupportTicket[]> {
  const snap = await tickets().orderBy("updatedAt", "desc").limit(300).get();
  let rows = snap.docs.map((d) => toTicket(d.id, d.data()));
  const status = filter.status ?? "active";
  if (status === "active") rows = rows.filter((t) => t.status !== "closed");
  else if (status !== "all") rows = rows.filter((t) => t.status === status);
  const q = filter.query?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((t) =>
      [t.ticketNumber, t.name, t.email, t.subject, t.lastMessagePreview].some((v) => v.toLowerCase().includes(q)),
    );
  }
  return rows;
}

export async function ticketCounts(): Promise<Record<TicketStatus, number> & { unread: number }> {
  const snap = await tickets().orderBy("updatedAt", "desc").limit(300).get();
  const counts = { open: 0, in_progress: 0, waiting: 0, closed: 0, unread: 0 };
  for (const doc of snap.docs) {
    const t = toTicket(doc.id, doc.data());
    counts[t.status] += 1;
    if (t.unreadForStaff) counts.unread += 1;
  }
  return counts;
}

export async function getTicket(
  ticketNumber: string,
): Promise<{ ticket: SupportTicket; messages: TicketMessage[] } | null> {
  if (!isTicketNumber(ticketNumber)) return null;
  const ref = tickets().doc(ticketNumber);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const msgs = await ref.collection("messages").orderBy("createdAt", "asc").limit(500).get();
  return {
    ticket: toTicket(snap.id, snap.data() ?? {}),
    messages: msgs.docs.map((d) => toMessage(d.id, d.data())),
  };
}

export async function markTicketRead(ticketNumber: string): Promise<void> {
  if (!isTicketNumber(ticketNumber)) return;
  await tickets().doc(ticketNumber).set({ unreadForStaff: false }, { merge: true });
}

/** Staff reply from the CMS. Returns the updated ticket and the saved message id. */
export async function addStaffReply(
  ticketNumber: string,
  input: { body: string; authorName: string | null; close: boolean },
): Promise<{ ticket: SupportTicket; messageId: string } | null> {
  const found = await getTicket(ticketNumber);
  if (!found) return null;
  const now = new Date().toISOString();
  const ref = tickets().doc(ticketNumber);
  const msgRef = ref.collection("messages").doc();
  await msgRef.set({
    direction: "staff",
    channel: "cms",
    authorName: input.authorName,
    body: input.body,
    createdAt: now,
    emailStatus: null,
  });
  const status = statusAfterMessage(found.ticket.status, "staff", input.close);
  const patch = {
    status,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: previewOf(input.body),
    messageCount: found.ticket.messageCount + 1,
    unreadForStaff: false,
    closedAt: status === "closed" ? now : null,
  };
  await ref.set(patch, { merge: true });
  return { ticket: { ...found.ticket, ...patch }, messageId: msgRef.id };
}

export async function setMessageEmailStatus(
  ticketNumber: string,
  messageId: string,
  emailStatus: "sent" | "skipped" | "failed",
): Promise<void> {
  await tickets().doc(ticketNumber).collection("messages").doc(messageId).set({ emailStatus }, { merge: true });
}

export async function setTicketStatus(
  ticketNumber: string,
  status: TicketStatus,
): Promise<SupportTicket | null> {
  const found = await getTicket(ticketNumber);
  if (!found) return null;
  const now = new Date().toISOString();
  const patch = {
    status,
    updatedAt: now,
    closedAt: status === "closed" ? found.ticket.closedAt ?? now : null,
    ...(status === "closed" ? { unreadForStaff: false } : {}),
  };
  await tickets().doc(ticketNumber).set(patch, { merge: true });
  return { ...found.ticket, ...patch };
}

/**
 * Reader replied by email. Skips duplicates (same Resend email id) and
 * reopens the ticket. Returns null when the ticket does not exist.
 */
export async function addCustomerEmailReply(
  ticketNumber: string,
  input: { body: string; providerMessageId: string; authorName: string | null },
): Promise<{ ticket: SupportTicket; duplicate: boolean } | null> {
  if (!isTicketNumber(ticketNumber)) return null;
  const ref = tickets().doc(ticketNumber);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const ticket = toTicket(snap.id, snap.data() ?? {});
  const msgId = `email_${input.providerMessageId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100)}`;
  const msgRef = ref.collection("messages").doc(msgId);
  const now = new Date().toISOString();
  try {
    await msgRef.create({
      direction: "customer",
      channel: "email",
      authorName: input.authorName ?? ticket.name,
      body: input.body,
      createdAt: now,
      providerMessageId: input.providerMessageId,
    });
  } catch (err) {
    if (isAlreadyExists(err)) return { ticket, duplicate: true };
    throw err;
  }
  const patch = {
    status: statusAfterMessage(ticket.status, "customer"),
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: previewOf(input.body),
    messageCount: ticket.messageCount + 1,
    unreadForStaff: true,
    closedAt: null,
  };
  await ref.set(patch, { merge: true });
  return { ticket: { ...ticket, ...patch }, duplicate: false };
}

/**
 * Tickets a signed-in reader may see: sent from their account, plus (when
 * `email` is given, i.e. the account email is verified) ones sent with that
 * email. Two single-field equality queries, merged and sorted in memory, so
 * no composite index is needed.
 */
export async function listTicketsForReader(reader: {
  userId: string;
  email: string | null;
}): Promise<SupportTicket[]> {
  const byId = new Map<string, SupportTicket>();
  const queries = [tickets().where("userId", "==", reader.userId).limit(100).get()];
  const email = reader.email?.trim().toLowerCase();
  if (email) queries.push(tickets().where("email", "==", email).limit(100).get());
  for (const snap of await Promise.all(queries)) {
    for (const doc of snap.docs) byId.set(doc.id, toTicket(doc.id, doc.data()));
  }
  return sortByLatest([...byId.values()]);
}

/** Reader replied from My Journey → Help. Reopens the ticket, like an email reply. */
export async function addCustomerSiteReply(
  ticketNumber: string,
  input: { body: string; authorName: string | null },
): Promise<{ ticket: SupportTicket; message: TicketMessage } | null> {
  if (!isTicketNumber(ticketNumber)) return null;
  const ref = tickets().doc(ticketNumber);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const ticket = toTicket(snap.id, snap.data() ?? {});
  const now = new Date().toISOString();
  const msgRef = ref.collection("messages").doc();
  const message = {
    direction: "customer",
    channel: "site",
    authorName: input.authorName ?? ticket.name,
    body: input.body,
    createdAt: now,
  };
  await msgRef.set(message);
  const patch = {
    status: statusAfterMessage(ticket.status, "customer"),
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: previewOf(input.body),
    messageCount: ticket.messageCount + 1,
    unreadForStaff: true,
    closedAt: null,
  };
  await ref.set(patch, { merge: true });
  return { ticket: { ...ticket, ...patch }, message: toMessage(msgRef.id, message) };
}
