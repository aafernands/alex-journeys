/**
 * Copy for Auth.js `?error=` on `/login`.
 *
 * Auth.js v5 puts the error `type` in the query (`OAuthCallbackError`,
 * `Configuration`, …). Older names (`OAuthCallback`) are accepted too.
 * Unknown codes still name themselves so a new Auth.js code is visible.
 */
const OAUTH_CALLBACK =
  "The provider could not finish sign-in after you authorized. Check that the callback URL and client secret match the app, then try again.";

const ACCOUNT_NOT_LINKED =
  "That email is already used with a different sign-in method. Use the method you used originally.";

const MESSAGES: Record<string, string> = {
  AccessDenied: "Sign-in was denied. Your account may be disabled.",
  OAuthCallback: OAUTH_CALLBACK,
  OAuthCallbackError: OAUTH_CALLBACK,
  Callback: OAUTH_CALLBACK,
  OAuthSignin: "Could not start sign-in with that provider. Try again.",
  OAuthSigninError: "Could not start sign-in with that provider. Try again.",
  OAuthCreateAccount:
    "Could not create an account from that sign-in. Try again.",
  EmailCreateAccount: "Could not create an account from that email. Try again.",
  Configuration:
    "X could not finish sign-in because the server configuration does not match the X app. On Vercel, AUTH_TWITTER_ID and AUTH_TWITTER_SECRET must be the current OAuth 2.0 Client ID and Client Secret from the X portal (not the API Key or API Key Secret). Save them, redeploy, and try again. This is not a denied sign-in.",
  Verification:
    "This sign-in link is no longer valid. It may have expired or already been used.",
  OAuthAccountNotLinked: ACCOUNT_NOT_LINKED,
  AccountNotLinked: ACCOUNT_NOT_LINKED,
  EmailSignin: "The email could not be sent. Try again.",
  CredentialsSignin: "Invalid email or password.",
  SessionRequired: "Please sign in to continue.",
  MissingCSRF: "This sign-in request expired. Refresh the page and try again.",
};

export function readerLoginErrorMessage(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const message = MESSAGES[trimmed] ?? "Sign-in failed. Try again.";
  return `${message} (${trimmed})`;
}
