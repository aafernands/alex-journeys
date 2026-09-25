const DEFAULT_SITE_URL = "https://www.alexjourneys.com";

/** Canonical site origin. `NEXT_PUBLIC_SITE_URL` overrides the Alex Journeys default. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(
    /\/+$/,
    "",
  );
}
