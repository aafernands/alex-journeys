/**
 * Email verification codes and links in Firestore:
 * `emailVerifications/{userId}` holds one live request per account.
 *
 * Fields: email, purpose ("verify" | "add-password"), codeHash (null for
 * add-password), tokenHash, expiresAt (ISO), attempts, sentAt (ms[] for the
 * last hour), createdAt. Only hashes are stored. See email-verification.ts.
 */
import { randomBytes } from "node:crypto";
import { publicSiteOrigin, sendEmailSafe, type SafeSendResult } from "@/lib/email";
import {
  checkVerificationRecord,
  generateVerificationCode,
  hashVerificationSecret,
  secretMatches,
  verificationSendAllowance,
  VERIFY_TTL_MINUTES,
  VERIFY_TTL_MS,
  type VerificationPurpose,
} from "@/lib/email-verification";
import { addPasswordConfirmEmail, emailVerificationEmail } from "@/lib/emails/templates";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  confirmPendingPassword,
  getUserById,
  markEmailVerified,
  normalizeEmail,
  UsersUnavailableError,
  type UserProfile,
} from "@/lib/users";

const COLLECTION = "emailVerifications";

function verifications() {
  if (!isFirebaseConfigured()) throw new UsersUnavailableError();
  const db = getFirestoreDb();
  if (!db) throw new UsersUnavailableError();
  return db.collection(COLLECTION);
}

export type StartVerificationResult =
  | { status: "sent" | "skipped" }
  | { status: "already_verified" }
  | { status: "rate_limited"; retryAfterSec: number }
  | { status: "failed"; error: string };

function readSentAt(raw: unknown): number[] {
  return Array.isArray(raw) ? raw.filter((t): t is number => typeof t === "number") : [];
}

/**
 * Create a fresh code + link and email it. Rate limited per account: one
 * email a minute, five an hour.
 */
export async function startEmailVerification(
  user: Pick<UserProfile, "id" | "email" | "name" | "emailVerified">,
  purpose: VerificationPurpose = "verify",
): Promise<StartVerificationResult> {
  const email = normalizeEmail(user.email);
  if (!email) return { status: "failed", error: "This account has no email address." };
  if (purpose === "verify" && user.emailVerified) return { status: "already_verified" };

  const ref = verifications().doc(user.id);
  const snap = await ref.get();
  const allowance = verificationSendAllowance(readSentAt(snap.data()?.sentAt));
  if (!allowance.ok) return { status: "rate_limited", retryAfterSec: allowance.retryAfterSec };

  const code = purpose === "verify" ? generateVerificationCode() : null;
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await ref.set({
    email,
    purpose,
    codeHash: code ? hashVerificationSecret(user.id, code) : null,
    tokenHash: hashVerificationSecret(user.id, token),
    expiresAt: new Date(now.getTime() + VERIFY_TTL_MS).toISOString(),
    attempts: 0,
    sentAt: allowance.recent,
    createdAt: now.toISOString(),
  });

  const link = `${publicSiteOrigin()}/verify-email?uid=${encodeURIComponent(user.id)}&token=${encodeURIComponent(token)}`;
  const message =
    purpose === "verify" && code
      ? emailVerificationEmail({ name: user.name, code, verifyUrl: link, minutes: VERIFY_TTL_MINUTES })
      : addPasswordConfirmEmail({ name: user.name, confirmUrl: link, minutes: VERIFY_TTL_MINUTES });
  const sent: SafeSendResult = await sendEmailSafe({ to: email, ...message }, `verification (${purpose})`);
  if (sent.status === "failed") {
    // Let them try again right away when delivery failed.
    await ref.set({ sentAt: allowance.recent.slice(0, -1) }, { merge: true });
    return { status: "failed", error: sent.error };
  }
  return { status: sent.status };
}

export type ConfirmVerificationResult =
  | { ok: true; purpose: VerificationPurpose; userId: string }
  | { ok: false; reason: "missing" | "expired" | "locked" | "mismatch" | "email_changed" };

/** Signed-in reader typed the 6-digit code. Counts attempts. */
export async function confirmVerificationCode(
  userId: string,
  code: string,
): Promise<ConfirmVerificationResult> {
  const user = await getUserById(userId);
  if (!user || user.disabled) return { ok: false, reason: "missing" };
  const ref = verifications().doc(user.id);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() ?? null : null;
  if (!data || data.purpose !== "verify") return { ok: false, reason: "missing" };
  const check = checkVerificationRecord(data, user.email);
  if (!check.ok) return check;
  if (!secretMatches(user.id, code, data.codeHash)) {
    const attempts = (typeof data.attempts === "number" ? data.attempts : 0) + 1;
    await ref.set({ attempts }, { merge: true });
    return { ok: false, reason: attempts >= 5 ? "locked" : "mismatch" };
  }
  await markEmailVerified(user.id, user.email);
  await ref.delete();
  return { ok: true, purpose: "verify", userId: user.id };
}

/** Link from the email: works without being signed in. */
export async function confirmVerificationLink(
  userId: string,
  token: string,
): Promise<ConfirmVerificationResult> {
  const id = userId.trim();
  if (!id || id.includes("/") || token.length < 20) return { ok: false, reason: "missing" };
  const user = await getUserById(id);
  if (!user || user.disabled) return { ok: false, reason: "missing" };
  const ref = verifications().doc(user.id);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() ?? null : null;
  const check = checkVerificationRecord(data, user.email);
  if (!check.ok) return check;
  if (!secretMatches(user.id, token, data?.tokenHash)) {
    const attempts = (typeof data?.attempts === "number" ? data.attempts : 0) + 1;
    await ref.set({ attempts }, { merge: true });
    return { ok: false, reason: "mismatch" };
  }
  const purpose: VerificationPurpose = data?.purpose === "add-password" ? "add-password" : "verify";
  if (purpose === "add-password") {
    const switched = await confirmPendingPassword(user.id);
    if (!switched) {
      await ref.delete();
      return { ok: false, reason: "missing" };
    }
  } else {
    await markEmailVerified(user.id, user.email);
  }
  await ref.delete();
  return { ok: true, purpose, userId: user.id };
}
