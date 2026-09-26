/**
 * Premium status on the reader profile in Cloud Firestore (`users/{userId}`).
 * The same document already holds the account (see users.ts). Membership is a
 * nested `membership` map so profile updates, which merge other fields, leave
 * it in place. Stripe customer and subscription ids stay server-side.
 */
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  parseMembership,
  type MembershipRecord,
} from "@/lib/membership";

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
