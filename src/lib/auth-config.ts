import { isCredentialsStoreReady } from "@/lib/users";

/**
 * Auth.js env checks and reader-vs-admin rules.
 * Kept out of `src/auth.ts` so tests can import them without loading Next.js.
 * `src/auth.ts` re-exports these for the rest of the app.
 */

function adminEmails(): Set<string> {
  const raw = process.env.CMS_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/** True when CMS_ADMIN_EMAILS lists at least one address. */
export function hasCmsAdminAllowlist(): boolean {
  return adminEmails().size > 0;
}

/** True when Google OAuth client env vars are set. */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim(),
  );
}

/** True when X (Twitter) OAuth 2.0 client env vars are set. */
export function isTwitterAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_TWITTER_ID?.trim() &&
      process.env.AUTH_TWITTER_SECRET?.trim(),
  );
}

/** True when GitHub OAuth client env vars are set. */
export function isGitHubAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH_GITHUB_ID?.trim() &&
      process.env.AUTH_GITHUB_SECRET?.trim(),
  );
}

/**
 * CMS admin from an Auth.js session.
 * X is reader-only: a Twitter sign-in never sets isAdmin, even if an email
 * on the profile is in CMS_ADMIN_EMAILS. Google, GitHub, and email/password
 * still match the allowlist. Sessions that predate provider tracking keep
 * the email check.
 */
export function grantsCmsAdmin(input: {
  email: string | null | undefined;
  authProvider?: string | null;
}): boolean {
  if (input.authProvider === "twitter") return false;
  return isAdminEmail(input.email);
}

/** True when email/password reader auth can run (AUTH_SECRET + Firebase). */
export function isCredentialsAuthConfigured(): boolean {
  return isCredentialsStoreReady();
}

/**
 * True when Auth.js can run for public readers (secret + Google, X, and/or
 * credentials store).
 */
export function isReaderAuthConfigured(): boolean {
  return (
    Boolean(process.env.AUTH_SECRET?.trim()) &&
    (isGoogleAuthConfigured() ||
      isTwitterAuthConfigured() ||
      isCredentialsAuthConfigured())
  );
}

/** True when Auth.js can run (secret + at least one provider). */
export function isOauthConfigured(): boolean {
  return (
    Boolean(process.env.AUTH_SECRET?.trim()) &&
    (isGoogleAuthConfigured() ||
      isTwitterAuthConfigured() ||
      isGitHubAuthConfigured() ||
      isCredentialsAuthConfigured())
  );
}
