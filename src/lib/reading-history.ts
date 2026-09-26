/**
 * Recently viewed stories, guides, and places for signed-in readers.
 * Cloud Firestore document (one read + one write per view, no index needed):
 *   users/{userId}/activity/history  →  { items: HistoryEntry[], updatedAt }
 * Newest first, deduped by kind + slug, capped at HISTORY_LIMIT.
 */
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";

export const HISTORY_LIMIT = 50;

/** Same page viewed again within this window does not rewrite the document. */
const REVISIT_WINDOW_MS = 5 * 60 * 1000;

export const HISTORY_KINDS = ["story", "guide", "place"] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];

export type HistoryEntry = {
  kind: HistoryKind;
  slug: string;
  title: string;
  href: string;
  viewedAt: string;
};

export class HistoryUnavailableError extends Error {
  constructor(message = "Firestore is not configured.") {
    super(message);
    this.name = "HistoryUnavailableError";
  }
}

function historyDoc(userId: string) {
  if (!isFirebaseConfigured()) throw new HistoryUnavailableError();
  const db = getFirestoreDb();
  if (!db) throw new HistoryUnavailableError();
  const uid = userId.trim();
  if (!uid || uid.includes("/") || uid.length > 256) {
    throw new Error("Invalid user id.");
  }
  return db.collection("users").doc(uid).collection("activity").doc("history");
}

export function isHistoryKind(value: unknown): value is HistoryKind {
  return typeof value === "string" && (HISTORY_KINDS as readonly string[]).includes(value);
}

function readEntries(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const e = item as Record<string, unknown>;
    if (!isHistoryKind(e.kind) || typeof e.slug !== "string" || !e.slug) continue;
    const href = typeof e.href === "string" && e.href.startsWith("/") ? e.href : "";
    if (!href) continue;
    out.push({
      kind: e.kind,
      slug: e.slug,
      title: typeof e.title === "string" && e.title.trim() ? e.title : e.slug,
      href,
      viewedAt: typeof e.viewedAt === "string" ? e.viewedAt : new Date(0).toISOString(),
    });
  }
  return out;
}

/**
 * Put `entry` at the front, drop an older copy of the same page, keep the
 * newest HISTORY_LIMIT. Pure, so it can be tested without Firestore.
 */
export function mergeHistory(
  existing: HistoryEntry[],
  entry: HistoryEntry,
  limit = HISTORY_LIMIT,
): HistoryEntry[] {
  const rest = existing.filter((e) => !(e.kind === entry.kind && e.slug === entry.slug));
  return [entry, ...rest].slice(0, limit);
}

/** Recently viewed pages, newest first. */
export async function listHistory(userId: string): Promise<HistoryEntry[]> {
  const snap = await historyDoc(userId).get();
  return snap.exists ? readEntries(snap.data()?.items) : [];
}

/** Record a view. Skips the write when the same page was the last one seen a moment ago. */
export async function recordHistory(
  userId: string,
  entry: Omit<HistoryEntry, "viewedAt">,
): Promise<void> {
  const ref = historyDoc(userId);
  const now = new Date();
  await ref.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const items = snap.exists ? readEntries(snap.data()?.items) : [];
    const top = items[0];
    if (
      top &&
      top.kind === entry.kind &&
      top.slug === entry.slug &&
      now.getTime() - new Date(top.viewedAt).getTime() < REVISIT_WINDOW_MS
    ) {
      return;
    }
    const next = mergeHistory(items, { ...entry, viewedAt: now.toISOString() });
    tx.set(ref, { items: next, updatedAt: now.toISOString() });
  });
}

/** Clear every entry. */
export async function clearHistory(userId: string): Promise<void> {
  await historyDoc(userId).delete();
}

/** Remove one page from history. */
export async function removeHistoryEntry(
  userId: string,
  kind: HistoryKind,
  slug: string,
): Promise<void> {
  const ref = historyDoc(userId);
  await ref.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const items = readEntries(snap.data()?.items).filter(
      (e) => !(e.kind === kind && e.slug === slug),
    );
    tx.set(ref, { items, updatedAt: new Date().toISOString() });
  });
}
