/**
 * Premium status on the reader profile in Cloud Firestore (`users/{userId}`).
 * The same document already holds the account (see users.ts). Membership is a
 * nested `membership` map so profile updates, which merge other fields, leave
 * it in place. Stripe customer and subscription ids stay server-side.
 */
import { createHash } from "node:crypto";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  cleanPremiumEmail,
  isPremium,
  isStaleStripeEvent,
  parseMembership,
  subscriptionAppliesToMember,
  withStripeEvent,
  type MembershipRecord,
  type SubscriptionSync,
} from "@/lib/membership";
import { getUserById, getVerifiedUserByEmail, normalizeEmail } from "@/lib/users";

function usersCollection() {
  if (!isFirebaseConfigured()) return null;
  const db = getFirestoreDb();
  if (!db) return null;
  return db.collection("users");
}

export async function getMembership(userId: string): Promise<MembershipRecord | null> {
  const id = userId.trim();
  if (!id || id.includes("/")) return null;
  const users = usersCollection();
  if (!users) return null;
  const snap = await users.doc(id).get();
  if (!snap.exists) return null;
  return parseMembership(snap.data()?.membership);
}

export async function findUserIdByStripeCustomer(
  customerId: string,
): Promise<string | null> {
  const id = customerId.trim();
  if (!id) return null;
  const users = usersCollection();
  if (!users) return null;
  const snap = await users.where("membership.stripeCustomerId", "==", id).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0]?.id ?? null;
}

export async function saveMembership(
  userId: string,
  membership: MembershipRecord,
): Promise<void> {
  const id = userId.trim();
  if (!id || id.includes("/") || id.includes("\\")) {
    throw new Error("Invalid user.");
  }
  const users = usersCollection();
  if (!users) {
    throw new Error("Accounts aren’t available right now.");
  }
  await users.doc(id).set(
    {
      membership,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

/* ——— Memberships bought on /premium/join without an account ——— */
/*
 * Reader docs are keyed by provider: Google/X use the provider account id,
 * email/password uses `cred_<sha256(email)>`. A doc created ahead of time for
 * a Google reader would be orphaned, so a signed-out purchase whose email has
 * no account yet waits in `premiumPending/{sha256(email)}`. The first time a
 * reader with that email is seen signed in, `getReaderMembership` moves it
 * onto their `users/{id}` doc.
 */

const PENDING_COLLECTION = "premiumPending";

function pendingCollection() {
  if (!isFirebaseConfigured()) return null;
  const db = getFirestoreDb();
  if (!db) return null;
  return db.collection(PENDING_COLLECTION);
}

export function pendingMembershipDocId(email: string): string {
  return createHash("sha256").update(`premium:${email.trim().toLowerCase()}`).digest("hex");
}

export async function getPendingMembership(email: string): Promise<MembershipRecord | null> {
  const clean = cleanPremiumEmail(email);
  const pending = pendingCollection();
  if (!clean || !pending) return null;
  const snap = await pending.doc(pendingMembershipDocId(clean)).get();
  if (!snap.exists) return null;
  return parseMembership(snap.data()?.membership);
}

async function savePendingMembership(email: string, membership: MembershipRecord): Promise<void> {
  const pending = pendingCollection();
  if (!pending) throw new Error("Accounts aren’t available right now.");
  await pending.doc(pendingMembershipDocId(email)).set(
    { email, membership, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

export type MembershipTarget =
  | { kind: "user"; userId: string }
  | { kind: "pending"; email: string };

/**
 * Who a Stripe subscription belongs to: metadata userId, then the reader who
 * already holds this Stripe customer, then a reader account that has
 * VERIFIED the buyer email, then a pending record for that email. An
 * unverified account with that email never receives the membership directly;
 * it waits in pending until the owner verifies (see email-verification.ts).
 */
export async function resolveMembershipTarget(input: {
  userId: string | null;
  customerId: string | null;
  email: string | null | undefined;
}): Promise<MembershipTarget | null> {
  if (input.userId) return { kind: "user", userId: input.userId };
  if (input.customerId) {
    const byCustomer = await findUserIdByStripeCustomer(input.customerId);
    if (byCustomer) return { kind: "user", userId: byCustomer };
  }
  const email = cleanPremiumEmail(input.email);
  if (!email) return null;
  const account = await getVerifiedUserByEmail(email);
  if (account) return { kind: "user", userId: account.id };
  return { kind: "pending", email };
}

export async function readTargetMembership(target: MembershipTarget): Promise<MembershipRecord | null> {
  return target.kind === "user"
    ? getMembership(target.userId)
    : getPendingMembership(target.email);
}

export async function saveTargetMembership(
  target: MembershipTarget,
  membership: MembershipRecord,
): Promise<void> {
  if (target.kind === "user") await saveMembership(target.userId, membership);
  else await savePendingMembership(target.email, membership);
}

/**
 * Apply a Stripe subscription snapshot to its owner. Shared by the webhook
 * and the on-site checkout confirmation. `eventCreated` is Unix seconds.
 */
export async function applySubscriptionSync(
  sync: SubscriptionSync,
  eventCreated: number,
): Promise<{ result: "saved" | "stale" | "ignored"; target: MembershipTarget | null }> {
  const target = await resolveMembershipTarget({
    userId: sync.userId,
    customerId: sync.customerId,
    email: sync.email,
  });
  if (!target) return { result: "ignored", target: null };
  const existing = await readTargetMembership(target);
  if (isStaleStripeEvent(existing, eventCreated)) return { result: "stale", target };
  if (!subscriptionAppliesToMember(sync.membership, existing)) return { result: "ignored", target };
  // A second, unfinished checkout must not knock out a live membership.
  if (
    isPremium({ membership: existing }) &&
    existing?.stripeSubscriptionId !== sync.membership.stripeSubscriptionId &&
    !isPremium({ membership: sync.membership })
  ) {
    return { result: "ignored", target };
  }
  await saveTargetMembership(target, withStripeEvent(sync.membership, eventCreated));
  return { result: "saved", target };
}

/**
 * Membership for a signed-in reader. When their doc has no Premium yet and a
 * signed-out purchase is waiting for their email, move it onto the account,
 * but only once the account has verified that email.
 */
export async function getReaderMembership(
  userId: string,
  email: string | null | undefined,
): Promise<MembershipRecord | null> {
  const current = await getMembership(userId);
  if (isPremium({ membership: current })) return current;
  const clean = cleanPremiumEmail(email);
  if (!clean) return current;
  try {
    if (!(await ownsVerifiedEmail(userId, clean))) return current;
    const claimed = await claimPendingMembership(userId, clean, current);
    return claimed ?? current;
  } catch (err) {
    console.warn("[premium] pending membership claim failed:", err);
    return current;
  }
}

/** The profile's own email is `email` and it has been verified. */
async function ownsVerifiedEmail(userId: string, email: string): Promise<boolean> {
  const profile = await getUserById(userId);
  if (!profile || profile.disabled || !profile.emailVerified) return false;
  return normalizeEmail(profile.email) === email;
}

/** True when a guest purchase is waiting for this email. */
export async function hasPendingMembership(email: string | null | undefined): Promise<boolean> {
  const clean = cleanPremiumEmail(email);
  if (!clean) return false;
  const pending = pendingCollection();
  if (!pending) return false;
  const snap = await pending.doc(pendingMembershipDocId(clean)).get();
  return snap.exists;
}

async function claimPendingMembership(
  userId: string,
  email: string,
  current: MembershipRecord | null,
): Promise<MembershipRecord | null> {
  const pending = pendingCollection();
  const users = usersCollection();
  const db = getFirestoreDb();
  if (!pending || !users || !db) return null;
  const pendingRef = pending.doc(pendingMembershipDocId(email));
  const userRef = users.doc(userId);
  const moved = await db.runTransaction(async (tx) => {
    const snap = await tx.get(pendingRef);
    if (!snap.exists) return null;
    const record = parseMembership(snap.data()?.membership);
    if (!record) {
      tx.delete(pendingRef);
      return null;
    }
    // Keep a live membership already on the account.
    if (isPremium({ membership: current }) && !isPremium({ membership: record })) return null;
    tx.set(
      userRef,
      { membership: record, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    tx.delete(pendingRef);
    return record;
  });
  if (moved?.stripeSubscriptionId || moved?.stripeCustomerId) {
    await tagStripeOwner(moved, userId);
  }
  return moved;
}

/** Best effort: later webhooks then route straight to the account. */
async function tagStripeOwner(record: MembershipRecord, userId: string): Promise<void> {
  try {
    const { getPremiumStripe } = await import("@/lib/stripe-premium");
    const stripe = getPremiumStripe();
    if (!stripe) return;
    if (record.stripeSubscriptionId) {
      await stripe.subscriptions.update(record.stripeSubscriptionId, {
        metadata: { userId },
      });
    }
    if (record.stripeCustomerId) {
      await stripe.customers.update(record.stripeCustomerId, { metadata: { userId } });
    }
  } catch (err) {
    console.warn("[premium] could not tag Stripe owner after claim:", err);
  }
}
