/**
 * Server-side Premium checks for pages and APIs. Membership is read from
 * `users/{id}.membership` in Firestore through getReaderMembership, never from
 * anything the browser sends.
 */
import { auth } from "@/auth";
import { isPremium } from "@/lib/membership";
import { getReaderMembership } from "@/lib/membership-store";

export type ReaderAccess = {
  signedIn: boolean;
  userId: string | null;
  member: boolean;
  /** Membership could not be read (Firestore down or not configured). */
  unavailable: boolean;
};

/** Signed-in reader and whether they are a Premium member right now. */
export async function readReaderAccess(): Promise<ReaderAccess> {
  const session = await auth();
  const userId = session?.user?.id?.trim() || null;
  if (!userId) return { signedIn: false, userId: null, member: false, unavailable: false };
  try {
    const membership = await getReaderMembership(userId, session?.user?.email);
    return { signedIn: true, userId, member: isPremium({ membership }), unavailable: false };
  } catch (err) {
    console.warn("[premium] membership lookup failed:", err);
    return { signedIn: true, userId, member: false, unavailable: true };
  }
}

export type MemberFileDecision =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 503; error: string };

/**
 * Who may download a member file. Signed out is 401, signed in without an
 * active membership is 403. A failed lookup never grants access.
 */
export function memberFileDecision(access: ReaderAccess): MemberFileDecision {
  if (!access.signedIn || !access.userId) {
    return { ok: false, status: 401, error: "Sign in to download member files." };
  }
  if (access.member) return { ok: true };
  if (access.unavailable) {
    return {
      ok: false,
      status: 503,
      error: "We can\u2019t check your membership right now. Try again in a little while.",
    };
  }
  return { ok: false, status: 403, error: "Downloads are for Premium members." };
}
