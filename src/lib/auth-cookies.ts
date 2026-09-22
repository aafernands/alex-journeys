/**
 * State and PKCE cookies shared by www and the apex.
 *
 * Those cookies use the `__Secure-` prefix, so a Domain is allowed. The CSRF
 * cookie uses `__Host-`, which forbids Domain — leave it host-only.
 *
 * Preview hosts and localhost stay on Auth.js defaults. A parent domain on a
 * vercel.app host would be rejected by the browser.
 */

const PRODUCTION_COOKIE_DOMAIN = ".fernandesjourneys.com";

type Env = Record<string, string | undefined>;

export function authCookieDomain(env: Env = process.env): string | undefined {
  const explicit = env.AUTH_COOKIE_DOMAIN?.trim();
  if (explicit) {
    if (explicit === "host" || explicit === "none") return undefined;
    return explicit.startsWith(".") ? explicit : `.${explicit}`;
  }
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") {
    return undefined;
  }
  const raw = env.AUTH_URL?.trim() || env.NEXTAUTH_URL?.trim() || "";
  if (raw) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (
        host === "fernandesjourneys.com" ||
        host === "www.fernandesjourneys.com"
      ) {
        return PRODUCTION_COOKIE_DOMAIN;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (env.VERCEL_ENV === "production") return PRODUCTION_COOKIE_DOMAIN;
  return undefined;
}

const SHARED = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: true,
};

export function authCookies(env: Env = process.env) {
  const domain = authCookieDomain(env);
  if (!domain) return undefined;
  const options = { ...SHARED, domain };
  return {
    pkceCodeVerifier: { options: { ...options, maxAge: 60 * 15 } },
    state: { options: { ...options, maxAge: 60 * 15 } },
  };
}
