/**
 * Forward-to-inbox storage. Server-only.
 *
 * Mailbox settings and suggestions live under the reader:
 *   users/{userId}/inboundMailbox/settings
 *   users/{userId}/inboundImports/{id}
 *   users/{userId}/trips/{tripId}/inbound/settings
 *   users/{userId}/trips/{tripId}/inboundImports/{id}
 *
 * inboundRoutes/{token} is an index so the webhook can find the owner
 * without scanning users. Suggestions keep parsed fields and the provider
 * message id — not the raw HTML.
 */
import { createHash } from "node:crypto";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import type { Query } from "firebase-admin/firestore";
import {
  createInboundToken,
  formatInboundAddress,
  isInboundToken,
  tokensFromRecipients,
} from "@/lib/inbound-address";
import {
  INBOUND_IMPORT_TYPES,
  parseInboundEmail,
  type InboundImportType,
  type InboundMailboxView,
  type InboundSuggestion,
} from "@/lib/inbound-parse";
import { sanitizeTripId, sanitizeUserId } from "@/lib/trips";

const MAX_PENDING = 40;

export class InboundUnavailableError extends Error {
  constructor(message = "Firestore is not configured.") {
    super(message);
    this.name = "InboundUnavailableError";
  }
}

export type InboundScope =
  | { kind: "account" }
  | { kind: "trip"; tripId: string };

export type IngestResult = {
  ok: true;
  stored: number;
  ignored?: "unknown" | "disabled" | "duplicate" | "empty" | "full";
};

type MailboxRecord = {
  token: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

function requireDb() {
  if (!isFirebaseConfigured()) throw new InboundUnavailableError();
  const db = getFirestoreDb();
  if (!db) throw new InboundUnavailableError();
  return db;
}

function userRef(userId: string) {
  return requireDb().collection("users").doc(sanitizeUserId(userId));
}

function settingsRef(userId: string, scope: InboundScope) {
  if (scope.kind === "account") {
    return userRef(userId).collection("inboundMailbox").doc("settings");
  }
  const tripId = sanitizeTripId(scope.tripId);
  return userRef(userId).collection("trips").doc(tripId).collection("inbound").doc("settings");
}

function importsRef(userId: string, scope: InboundScope) {
  if (scope.kind === "account") return userRef(userId).collection("inboundImports");
  const tripId = sanitizeTripId(scope.tripId);
  return userRef(userId).collection("trips").doc(tripId).collection("inboundImports");
}

function receiptsRef(userId: string, scope: InboundScope) {
  if (scope.kind === "account") return userRef(userId).collection("inboundReceipts");
  const tripId = sanitizeTripId(scope.tripId);
  return userRef(userId).collection("trips").doc(tripId).collection("inboundReceipts");
}

function routeRef(token: string) {
  if (!isInboundToken(token)) throw new Error("Invalid forward address.");
  return requireDb().collection("inboundRoutes").doc(token);
}

function scopeFromRoute(data: Record<string, unknown>): InboundScope | null {
  if (data.scope === "account") return { kind: "account" };
  if (data.scope === "trip" && typeof data.tripId === "string") {
    return { kind: "trip", tripId: data.tripId };
  }
  return null;
}

async function tripExists(userId: string, tripId: string): Promise<boolean> {
  const id = sanitizeTripId(tripId);
  const snap = await userRef(userId).collection("trips").doc(id).get();
  return snap.exists;
}

function mailboxFromData(data: Record<string, unknown> | undefined): MailboxRecord | null {
  if (!data || typeof data.token !== "string" || !isInboundToken(data.token)) return null;
  const now = new Date().toISOString();
  return {
    token: data.token,
    enabled: data.enabled !== false,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now,
  };
}

function isImportType(value: unknown): value is InboundImportType {
  return typeof value === "string" && (INBOUND_IMPORT_TYPES as readonly string[]).includes(value);
}

function suggestionFromDoc(
  id: string,
  data: Record<string, unknown>,
): InboundSuggestion | null {
  if (data.status !== "suggested" || !isImportType(data.type)) return null;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const messageId = typeof data.messageId === "string" ? data.messageId : "";
  const createdAt = typeof data.createdAt === "string" ? data.createdAt : "";
  if (!title || !messageId || !createdAt) return null;
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";
  return {
    id,
    type: data.type,
    title: title.slice(0, 160),
    confirmation: text(data.confirmation, 40),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(text(data.startDate, 10)) ? text(data.startDate, 10) : "",
    endDate: /^\d{4}-\d{2}-\d{2}$/.test(text(data.endDate, 10)) ? text(data.endDate, 10) : "",
    time: /^\d{2}:\d{2}$/.test(text(data.time, 5)) ? text(data.time, 5) : "",
    url: text(data.url, 500),
    messageId: messageId.slice(0, 180),
    source: "email",
    subject: text(data.subject, 140),
    createdAt,
  };
}

async function listPending(userId: string, scope: InboundScope): Promise<InboundSuggestion[]> {
  const snap = await importsRef(userId, scope).where("status", "==", "suggested").limit(MAX_PENDING).get();
  const suggestions: InboundSuggestion[] = [];
  for (const doc of snap.docs) {
    const suggestion = suggestionFromDoc(doc.id, doc.data() as Record<string, unknown>);
    if (suggestion) suggestions.push(suggestion);
  }
  suggestions.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return suggestions;
}

function viewFor(mailbox: MailboxRecord, scope: InboundScope, suggestions: InboundSuggestion[]): InboundMailboxView {
  return {
    address: formatInboundAddress(mailbox.token),
    enabled: mailbox.enabled,
    scope: scope.kind,
    suggestions,
  };
}

/** Create the mailbox on first view. Returns null when the trip is not theirs. */
export async function readOrCreateMailbox(
  userId: string,
  scope: InboundScope,
): Promise<InboundMailboxView | null> {
  if (scope.kind === "trip" && !(await tripExists(userId, scope.tripId))) return null;
  const ref = settingsRef(userId, scope);
  const existing = mailboxFromData((await ref.get()).data() as Record<string, unknown> | undefined);
  if (!existing) {
    const token = createInboundToken();
    const now = new Date().toISOString();
    const db = requireDb();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = mailboxFromData(snap.data() as Record<string, unknown> | undefined);
      if (current) return;
      tx.set(ref, { token, enabled: true, createdAt: now, updatedAt: now });
      tx.set(routeRef(token), {
        userId: sanitizeUserId(userId),
        scope: scope.kind,
        tripId: scope.kind === "trip" ? sanitizeTripId(scope.tripId) : null,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
    });
  }
  const mailbox = mailboxFromData((await ref.get()).data() as Record<string, unknown> | undefined);
  if (!mailbox) throw new InboundUnavailableError("Could not prepare a forward address.");
  const suggestions = await listPending(userId, scope);
  return viewFor(mailbox, scope, suggestions);
}

export async function updateMailbox(
  userId: string,
  scope: InboundScope,
  patch: { enabled?: boolean; rotate?: boolean },
): Promise<InboundMailboxView | null> {
  if (scope.kind === "trip" && !(await tripExists(userId, scope.tripId))) return null;
  const ref = settingsRef(userId, scope);
  const now = new Date().toISOString();
  const db = requireDb();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let mailbox = mailboxFromData(snap.data() as Record<string, unknown> | undefined);
    if (!mailbox) {
      const token = createInboundToken();
      mailbox = { token, enabled: true, createdAt: now, updatedAt: now };
      tx.set(ref, mailbox);
      tx.set(routeRef(token), {
        userId: sanitizeUserId(userId),
        scope: scope.kind,
        tripId: scope.kind === "trip" ? sanitizeTripId(scope.tripId) : null,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (patch.rotate) {
      const next = createInboundToken();
      tx.set(routeRef(mailbox.token), { enabled: false, updatedAt: now, rotatedAt: now }, { merge: true });
      tx.set(routeRef(next), {
        userId: sanitizeUserId(userId),
        scope: scope.kind,
        tripId: scope.kind === "trip" ? sanitizeTripId(scope.tripId) : null,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
      tx.set(ref, { token: next, enabled: true, createdAt: mailbox.createdAt, updatedAt: now }, { merge: true });
      return;
    }
    if (typeof patch.enabled === "boolean") {
      tx.set(ref, { enabled: patch.enabled, updatedAt: now }, { merge: true });
      tx.set(routeRef(mailbox.token), { enabled: patch.enabled, updatedAt: now }, { merge: true });
    }
  });
  return readOrCreateMailbox(userId, scope);
}

export async function setSuggestionStatus(
  userId: string,
  scope: InboundScope,
  importId: string,
  status: "added" | "dismissed",
): Promise<"ok" | "missing" | "closed"> {
  if (!/^[A-Za-z0-9-]{8,80}$/.test(importId)) return "missing";
  if (scope.kind === "trip" && !(await tripExists(userId, scope.tripId))) return "missing";
  const ref = importsRef(userId, scope).doc(importId);
  const db = requireDb();
  let result: "ok" | "missing" | "closed" = "missing";
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      result = "missing";
      return;
    }
    const data = snap.data() as Record<string, unknown> | undefined;
    if (data?.status !== "suggested") {
      result = "closed";
      return;
    }
    tx.set(
      ref,
      { status, resolvedAt: new Date().toISOString() },
      { merge: true },
    );
    result = "ok";
  });
  return result;
}

function receiptId(messageId: string): string {
  return createHash("sha256").update(messageId).digest("hex");
}

function suggestionPayload(
  parsed: ReturnType<typeof parseInboundEmail>[number],
  messageId: string,
  subject: string,
  now: string,
) {
  return {
    type: parsed.type,
    title: parsed.title.slice(0, 160),
    ...(parsed.confirmation ? { confirmation: parsed.confirmation } : {}),
    ...(parsed.startDate ? { startDate: parsed.startDate } : {}),
    ...(parsed.endDate ? { endDate: parsed.endDate } : {}),
    ...(parsed.time ? { time: parsed.time } : {}),
    ...(parsed.url ? { url: parsed.url } : {}),
    messageId: messageId.slice(0, 180),
    source: "email",
    subject: subject.replace(/\s+/g, " ").trim().slice(0, 140),
    status: "suggested",
    createdAt: now,
  };
}

/**
 * Parse one inbound message and queue suggestions for each matching token.
 * Unknown, disabled, and duplicate messages are ignored (callers still return 200).
 */
export async function ingestInboundEmail(input: {
  recipients: string[];
  messageId: string;
  subject: string;
  text: string;
  html: string;
}): Promise<IngestResult> {
  const messageId = input.messageId.trim().slice(0, 180);
  if (messageId.length < 6) return { ok: true, stored: 0, ignored: "empty" };
  const tokens = tokensFromRecipients(input.recipients);
  if (tokens.length === 0) return { ok: true, stored: 0, ignored: "unknown" };

  let stored = 0;
  let ignored: IngestResult["ignored"];
  for (const token of tokens) {
    const outcome = await ingestForToken(token, {
      messageId,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    stored += outcome.stored;
    if (outcome.ignored) ignored = outcome.ignored;
  }
  if (stored > 0) return { ok: true, stored };
  return { ok: true, stored: 0, ignored };
}

async function ingestForToken(
  token: string,
  input: { messageId: string; subject: string; text: string; html: string },
): Promise<IngestResult> {
  const db = requireDb();
  const routeSnap = await routeRef(token).get();
  if (!routeSnap.exists) return { ok: true, stored: 0, ignored: "unknown" };
  const route = (routeSnap.data() ?? {}) as Record<string, unknown>;
  if (route.enabled === false) return { ok: true, stored: 0, ignored: "disabled" };
  const userId = typeof route.userId === "string" ? route.userId : "";
  const scope = scopeFromRoute(route);
  if (!userId || !scope) return { ok: true, stored: 0, ignored: "unknown" };

  if (scope.kind === "trip" && !(await tripExists(userId, scope.tripId))) {
    await routeRef(token).set({ enabled: false, updatedAt: new Date().toISOString() }, { merge: true });
    return { ok: true, stored: 0, ignored: "unknown" };
  }

  const parsed = parseInboundEmail({
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  const now = new Date().toISOString();
  const receipt = receiptsRef(userId, scope).doc(receiptId(input.messageId));
  const pendingSnap = await importsRef(userId, scope)
    .where("status", "==", "suggested")
    .limit(MAX_PENDING)
    .get();
  const room = Math.max(0, MAX_PENDING - pendingSnap.size);
  const toStore = room > 0 ? parsed.slice(0, room) : [];
  let stored = 0;
  let ignored: NonNullable<IngestResult["ignored"]> | undefined;
  await db.runTransaction(async (tx) => {
    const seen = await tx.get(receipt);
    const freshRoute = await tx.get(routeRef(token));
    if (seen.exists) {
      ignored = "duplicate";
      return;
    }
    const fresh = (freshRoute.data() ?? {}) as Record<string, unknown>;
    if (!freshRoute.exists || fresh.enabled === false) {
      ignored = fresh.enabled === false ? "disabled" : "unknown";
      return;
    }
    if (parsed.length > 0 && toStore.length === 0) {
      tx.set(receipt, {
        messageId: input.messageId.slice(0, 180),
        createdAt: now,
        suggestionIds: [],
      });
      ignored = "full";
      return;
    }
    const ids: string[] = [];
    for (const item of toStore) {
      const ref = importsRef(userId, scope).doc();
      tx.set(ref, suggestionPayload(item, input.messageId, input.subject, now));
      ids.push(ref.id);
    }
    tx.set(receipt, {
      messageId: input.messageId.slice(0, 180),
      createdAt: now,
      suggestionIds: ids,
    });
    stored = ids.length;
    if (stored === 0) ignored = "empty";
  });

  if (stored > 0) return { ok: true, stored };
  return { ok: true, stored: 0, ignored: ignored ?? "empty" };
}

async function deleteQuery(query: Query): Promise<void> {
  const snap = await query.limit(100).get();
  if (snap.empty) return;
  const batch = requireDb().batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
  if (snap.size === 100) await deleteQuery(query);
}

/** Drop a trip's forward address, suggestions, and route index. */
export async function deleteTripInbound(userId: string, tripId: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const scope: InboundScope = { kind: "trip", tripId };
  const settings = await settingsRef(userId, scope).get();
  const mailbox = mailboxFromData(settings.data() as Record<string, unknown> | undefined);
  if (mailbox) {
    await routeRef(mailbox.token).delete().catch(() => undefined);
  }
  await deleteQuery(importsRef(userId, scope));
  await deleteQuery(receiptsRef(userId, scope));
  if (settings.exists) await settings.ref.delete();
}
