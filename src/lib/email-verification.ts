/**
 * Email verification rules (pure, no Firestore). Store and sending live in
 * email-verification-store.ts.
 *
 * Why it matters: a guest Premium purchase waits in `premiumPending` for
 * whoever signs in with the buyer email. Without verification, anyone could
 * register that email with a password and claim the membership. So pending
 * claims (and email-based webhook matching) only go to verified accounts.
 *
 * Verified means:
 * - `emailVerified: true` on the profile (code or link confirmed, password
 *   reset link used, email change confirmed, or Google sign-in with that
 *   same email), or
 * - legacy profiles with no `emailVerified` field that came from Google or
 *   GitHub (those providers verify the address).
 * Email/password accounts created before this change start unverified and
 * are asked to confirm from their account page.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export const VERIFY_TTL_MS = 30 * 60 * 1000;
export const VERIFY_TTL_MINUTES = VERIFY_TTL_MS / 60_000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_SENDS_PER_HOUR = 5;
export const MAX_CODE_ATTEMPTS = 5;

export type VerificationPurpose = "verify" | "add-password";

export function isEmailVerifiedProfile(data: {
  emailVerified?: unknown;
  providers?: unknown;
  email?: unknown;
}): boolean {
  if (typeof data.email !== "string" || !data.email.trim()) return false;
  if (data.emailVerified === true) return true;
  if (data.emailVerified === false) return false;
  const providers = Array.isArray(data.providers) ? data.providers : [];
  return providers.includes("google") || providers.includes("github");
}

export function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function normalizeVerificationCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\s|-/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

export function hashVerificationSecret(userId: string, secret: string): string {
  return createHash("sha256").update(`verify:${userId}:${secret}`).digest("hex");
}

export function secretMatches(userId: string, secret: string, storedHash: unknown): boolean {
  if (typeof storedHash !== "string" || storedHash.length !== 64) return false;
  const a = Buffer.from(hashVerificationSecret(userId, secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * May we send another verification email? At most one per minute and
 * MAX_SENDS_PER_HOUR per rolling hour. `sentAt` holds recent send times (ms).
 */
export function verificationSendAllowance(
  sentAt: readonly number[],
  now: number = Date.now(),
): { ok: true; recent: number[] } | { ok: false; retryAfterSec: number } {
  const recent = sentAt.filter((t) => Number.isFinite(t) && now - t < 60 * 60 * 1000).sort((x, y) => x - y);
  const last = recent[recent.length - 1];
  if (last !== undefined && now - last < RESEND_COOLDOWN_MS) {
    return { ok: false, retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000) };
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    const oldest = recent[0] ?? now;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now) / 1000)) };
  }
  return { ok: true, recent: [...recent, now] };
}

export type VerificationCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "expired" | "locked" | "mismatch" | "email_changed" };

/** Validate a stored verification record before comparing the secret. */
export function checkVerificationRecord(
  record: { email?: unknown; expiresAt?: unknown; attempts?: unknown } | null | undefined,
  currentEmail: string,
  now: number = Date.now(),
): VerificationCheck {
  if (!record) return { ok: false, reason: "missing" };
  if (typeof record.email !== "string" || record.email !== currentEmail.trim().toLowerCase()) {
    return { ok: false, reason: "email_changed" };
  }
  const expires = typeof record.expiresAt === "string" ? Date.parse(record.expiresAt) : NaN;
  if (!Number.isFinite(expires) || expires <= now) return { ok: false, reason: "expired" };
  const attempts = typeof record.attempts === "number" ? record.attempts : 0;
  if (attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: "locked" };
  return { ok: true };
}

export function verificationErrorMessage(reason: string): string {
  switch (reason) {
    case "expired":
    case "missing":
    case "email_changed":
      return "That code has expired. Send yourself a new one.";
    case "locked":
      return "Too many tries. Send yourself a new code.";
    case "mismatch":
      return "That code doesn’t match. Check the latest email and try again.";
    default:
      return "We couldn’t confirm your email. Try again.";
  }
}
