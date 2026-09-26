/**
 * My Journey (/account) sections. Deep-link with a hash (/account#saved) or a
 * query param (?tab=saved, or the older ?section=saved). Unknown values open
 * the overview.
 */
export const ACCOUNT_SECTIONS = [
  "overview",
  "trips",
  "bookings",
  "saved",
  "comments",
  "history",
  "profile",
  "settings",
] as const;

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

/** Logged-in Saved tab. Hash is enough for an in-app navigation. */
export const SAVED_ACCOUNT_HREF = "/account#saved";

/**
 * Sign-in return path. A query param survives the OAuth round trip; the
 * account page then switches to the Saved section.
 */
export const SAVED_SIGN_IN_RETURN = "/account?section=saved";

export const SAVED_SIGN_IN_INTRO = "Sign in to see your saved stories and trips.";

function isSection(value: string | null | undefined): value is AccountSection {
  return Boolean(value) && (ACCOUNT_SECTIONS as readonly string[]).includes(value as string);
}

export function accountSectionFromLocation(hash: string, search: string): AccountSection {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const query = params.get("section") ?? params.get("tab");
  if (isSection(query)) return query;
  const id = hash.replace(/^#/, "");
  if (isSection(id)) return id;
  return "overview";
}

export function accountReturnPath(section: AccountSection): string {
  return section === "overview" ? "/account" : `/account?section=${section}`;
}
