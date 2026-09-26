/**
 * CMS Members: reader profiles with a Premium membership, read server-side
 * with firebase-admin. Only CMS pages and CMS API routes call this.
 *
 * Query: `membership.status in [...]` is a single-field filter, so Firestore's
 * automatic index serves it (no composite index). Pages of 300 by document id.
 */
import type { DocumentData, Query, QueryDocumentSnapshot, QuerySnapshot } from "firebase-admin/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  MEMBERSHIP_STATUSES,
  parseMembership,
  premiumPrices,
  subscriptionAppliesToMember,
  type MembershipRecord,
} from "@/lib/membership";
import { getMembership, saveMembership } from "@/lib/membership-store";
import { getPremiumStripe, subscriptionSyncFromId } from "@/lib/stripe-premium";
import {
  memberBadge,
  nextDateFor,
  stripeCustomerUrl,
  summarizeMembers,
  type MemberRow,
  type MembersSummary,
} from "@/lib/cms/members-shared";

const PAGE_SIZE = 300;
const MAX_MEMBERS = 5000;
const MAX_STRIPE_SUBSCRIPTIONS = 2000;
const MEMBER_STATUSES = MEMBERSHIP_STATUSES.filter((s) => s !== "none");

export type MembersLoad = {
  rows: MemberRow[];
  summary: MembersSummary;
  /** Shown above the list when something is missing or partial. */
  notices: string[];
  unavailable: string | null;
};

function isoFrom(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function stripeKey(): string {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

function toRow(
  userId: string,
  data: DocumentData,
  record: MembershipRecord,
  startDates: Map<string, string>,
): MemberRow {
  const stripeStart = record.stripeSubscriptionId
    ? startDates.get(record.stripeSubscriptionId) ?? null
    : null;
  const next = nextDateFor(record);
  return {
    userId,
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : null,
    email: typeof data.email === "string" ? data.email.trim().toLowerCase() : "",
    image: typeof data.image === "string" && data.image.trim() ? data.image.trim() : null,
    plan: record.plan,
    status: record.status,
    badge: memberBadge(record.status, record.cancelAtPeriodEnd),
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    memberSince: stripeStart ?? isoFrom(data.createdAt),
    memberSinceFromStripe: Boolean(stripeStart),
    nextDate: next.date,
    nextDateLabel: next.label,
    stripeUrl: stripeCustomerUrl(record.stripeCustomerId, stripeKey()),
    canRefresh: Boolean(record.stripeSubscriptionId && getPremiumStripe()),
  };
}

/** Subscription id → start date, read from Stripe (read-only). */
async function stripeStartDates(): Promise<{ map: Map<string, string>; ok: boolean }> {
  const map = new Map<string, string>();
  const stripe = getPremiumStripe();
  if (!stripe) return { map, ok: false };
  try {
    let seen = 0;
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      const start = typeof sub.start_date === "number" ? sub.start_date : sub.created;
      if (typeof start === "number" && start > 0) {
        map.set(sub.id, new Date(start * 1000).toISOString());
      }
      seen += 1;
      if (seen >= MAX_STRIPE_SUBSCRIPTIONS) break;
    }
    return { map, ok: true };
  } catch (err) {
    console.warn("[cms/members] Stripe subscription list failed:", err instanceof Error ? err.message : err);
    return { map, ok: false };
  }
}

async function memberDocs(): Promise<{ docs: QueryDocumentSnapshot[]; truncated: boolean }> {
  const db = getFirestoreDb();
  if (!db) return { docs: [], truncated: false };
  const base = db.collection("users").where("membership.status", "in", MEMBER_STATUSES);
  const docs: QueryDocumentSnapshot[] = [];
  let last: QueryDocumentSnapshot | null = null;
  while (docs.length < MAX_MEMBERS) {
    const query: Query = last ? base.startAfter(last).limit(PAGE_SIZE) : base.limit(PAGE_SIZE);
    const snap: QuerySnapshot = await query.get();
    docs.push(...snap.docs);
    if (snap.size < PAGE_SIZE) return { docs, truncated: false };
    last = snap.docs[snap.docs.length - 1] ?? null;
    if (!last) break;
  }
  return { docs, truncated: docs.length >= MAX_MEMBERS };
}

export async function loadMembers(): Promise<MembersLoad> {
  const prices = premiumPrices();
  const empty = summarizeMembers([], prices);
  if (!isFirebaseConfigured()) {
    return {
      rows: [],
      summary: empty,
      notices: [],
      unavailable:
        "Firestore isn’t configured here, so members can’t be listed. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    };
  }

  let docs: QueryDocumentSnapshot[] = [];
  let truncated = false;
  try {
    ({ docs, truncated } = await memberDocs());
  } catch (err) {
    console.error("[cms/members] Firestore query failed:", err);
    return {
      rows: [],
      summary: empty,
      notices: [],
      unavailable: "Couldn’t load members from Firestore right now.",
    };
  }

  const notices: string[] = [];
  const stripe = docs.length > 0 ? await stripeStartDates() : { map: new Map<string, string>(), ok: true };
  if (!getPremiumStripe()) {
    notices.push("Stripe isn’t configured here. “Member since” uses the account creation date and Stripe links are hidden.");
  } else if (!stripe.ok) {
    notices.push("Stripe didn’t answer, so “Member since” uses the account creation date.");
  }
  if (truncated) notices.push(`Showing the first ${MAX_MEMBERS} members.`);

  const rows: MemberRow[] = [];
  for (const doc of docs) {
    const data = doc.data();
    const record = parseMembership(data.membership);
    if (!record || record.status === "none") continue;
    rows.push(toRow(doc.id, data, record, stripe.map));
  }
  rows.sort((a, b) => (b.memberSince ?? "").localeCompare(a.memberSince ?? ""));

  return { rows, summary: summarizeMembers(rows, prices), notices, unavailable: null };
}

export class MemberRefreshError extends Error {}

/** Re-read one member’s subscription from Stripe and store it. */
export async function refreshMemberFromStripe(userId: string): Promise<MemberRow> {
  const id = userId.trim();
  if (!id || id.includes("/") || id.includes("\\")) throw new MemberRefreshError("Invalid member.");
  if (!isFirebaseConfigured()) throw new MemberRefreshError("Firestore isn’t configured.");
  if (!getPremiumStripe()) throw new MemberRefreshError("Stripe isn’t configured.");

  const existing = await getMembership(id);
  if (!existing?.stripeSubscriptionId) {
    throw new MemberRefreshError("This member has no Stripe subscription on file.");
  }
  const sync = await subscriptionSyncFromId(existing.stripeSubscriptionId);
  if (!sync) throw new MemberRefreshError("Stripe didn’t return this subscription.");
  if (sync.userId && sync.userId !== id) {
    throw new MemberRefreshError("That subscription belongs to a different account.");
  }
  if (!subscriptionAppliesToMember(sync.membership, existing)) {
    throw new MemberRefreshError("That subscription isn’t a Premium plan.");
  }
  const next: MembershipRecord = { ...sync.membership, stripeEventAt: new Date().toISOString() };
  await saveMembership(id, next);

  const db = getFirestoreDb();
  const snap = db ? await db.collection("users").doc(id).get() : null;
  const startDates = new Map<string, string>();
  try {
    const stripe = getPremiumStripe();
    const sub = stripe ? await stripe.subscriptions.retrieve(existing.stripeSubscriptionId) : null;
    const start = sub ? sub.start_date || sub.created : 0;
    if (sub && start) startDates.set(sub.id, new Date(start * 1000).toISOString());
  } catch {
    /* Member since falls back to the account date. */
  }
  return toRow(id, snap?.data() ?? {}, next, startDates);
}

/** Active + trialing members for the CMS dashboard card. Null when unknown. */
export async function countActiveMembers(): Promise<number | null> {
  if (!isFirebaseConfigured()) return null;
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snap = await db
      .collection("users")
      .where("membership.status", "in", ["active", "trialing"])
      .count()
      .get();
    return snap.data().count;
  } catch (err) {
    console.warn("[cms/members] count failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
