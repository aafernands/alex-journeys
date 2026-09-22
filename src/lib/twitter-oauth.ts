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
