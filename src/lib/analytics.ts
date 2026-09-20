/**
 * Public analytics / Search Console helpers.
 *
 * NEXT_PUBLIC_* values are inlined at build time. Leave them unset so
 * production (and local) builds inject no gtag scripts.
 *
 * See docs/ANALYTICS.md.
 */

/** GA4 measurement IDs look like G-XXXXXXXX (letters/digits after the prefix). */
const GA_MEASUREMENT_ID_RE = /^G-[A-Z0-9]+$/i;

export type AnalyticsEnv = Record<string, string | undefined>;

function readEnv(env: AnalyticsEnv = process.env): AnalyticsEnv {
  return env;
}

/**
 * Resolved GA4 measurement ID, or undefined when unset/empty/invalid.
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` wins over alias `NEXT_PUBLIC_GA_ID`.
 */
export function getGaMeasurementId(
  env: AnalyticsEnv = process.env,
): string | undefined {
  const raw =
    readEnv(env).NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
    readEnv(env).NEXT_PUBLIC_GA_ID?.trim() ||
    "";

  if (!raw) return undefined;

  if (!GA_MEASUREMENT_ID_RE.test(raw)) {
    console.warn(
      "[analytics] Ignoring invalid GA measurement ID. Expected a GA4 id like G-XXXXXXXX.",
    );
    return undefined;
  }

  return raw;
}

export function isAnalyticsEnabled(env: AnalyticsEnv = process.env): boolean {
  return Boolean(getGaMeasurementId(env));
}

/** Search Console HTML-tag verification token, when configured. */
export function getGoogleSiteVerification(
  env: AnalyticsEnv = process.env,
): string | undefined {
  const raw = readEnv(env).NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || "";
  return raw || undefined;
}

export function ga4ScriptSrc(measurementId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
}

/** Inline gtag bootstrap. `measurementId` must already be validated. */
export function ga4InlineSnippet(measurementId: string): string {
  const idJson = JSON.stringify(measurementId);
  return [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "gtag('js', new Date());",
    `gtag('config', ${idJson});`,
  ].join("\n");
}
