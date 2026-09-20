/** Shared CMS cookie name — safe for proxy/edge (no Node imports). */
export const CMS_COOKIE_NAME = "fj_cms";
export const CMS_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Auth.js session cookie names (presence-only check in proxy). */
export const AUTHJS_SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;
