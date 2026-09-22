/**
 * X OAuth 2.0 authorize endpoint for the Auth.js Twitter provider.
 *
 * The built-in provider sets `authorization` to a URL string whose default
 * scope includes `tweet.read`. This site only needs the signed-in user's
 * profile and a refresh token.
 *
 * Pass `url` and `params` together. On @auth/core 0.41 the provider default
 * is a string, and a params-only object is merged onto that string by
 * replacing it with `{}`. Auth.js then falls back to `https://authjs.dev`
 * and sign-in dies as `error=Configuration` before X ever sees `client_id`,
 * `state`, or PKCE. A full URL string keeps those parameters in this version,
 * but the object form below is what Auth.js documents and what we test.
 */
export const TWITTER_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";

/** Profile + refresh token. Do not add `tweet.read`. */
export const TWITTER_OAUTH_SCOPE = "users.read offline.access";

export const twitterAuthorization = {
  url: TWITTER_AUTHORIZE_URL,
  params: { scope: TWITTER_OAUTH_SCOPE },
};

/** X OAuth 2 token endpoint. Matches the Auth.js Twitter provider default. */
export const TWITTER_TOKEN_URL = "https://api.x.com/2/oauth2/token";

/**
 * X user lookup. `user.fields=profile_image_url` is the Auth.js default.
 * The response is `{ data: { id, name, username, profile_image_url } }` and
 * usually has no `email`.
 */
export const TWITTER_USERINFO_URL =
  "https://api.x.com/2/users/me?user.fields=profile_image_url";

export function readTwitterOAuthCredentials(
  env: NodeJS.ProcessEnv = process.env,
): { clientId: string; clientSecret: string } {
  return {
    clientId: env.AUTH_TWITTER_ID?.trim() ?? "",
    clientSecret: env.AUTH_TWITTER_SECRET?.trim() ?? "",
  };
}

function requestHref(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * X rejects a token POST that authenticates with HTTP Basic and omits
 * `client_id` from the form body (`invalid_request` / `Missing required
 * parameter [client_id].`). Auth.js's default client auth is that shape.
 * The thrown error is not an Auth.js client error, so the callback becomes
 * `/login?error=Configuration` after Authorize succeeds.
 *
 * Putting `client_secret` in the body and dropping the Basic header is also
 * rejected (`Missing valid authorization header`). Add `client_id` only.
 */
export function ensureTwitterTokenClientId(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1] | undefined,
  clientId: string,
): void {
  const body = init?.body;
  if (!clientId || !(body instanceof URLSearchParams)) return;
  if (!requestHref(input).startsWith(TWITTER_TOKEN_URL)) return;
  if (!body.get("client_id")) body.set("client_id", clientId);
}

export function twitterTokenFetch(
  clientId: string,
  inner: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    ensureTwitterTokenClientId(input, init, clientId);
    return inner(input, init);
  };
}
