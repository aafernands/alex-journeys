export const ACCOUNT_SECTIONS = ["overview", "trips", "saved", "settings"] as const;

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

/** Logged-in Saved tab. Hash is enough for an in-app navigation. */
export const SAVED_ACCOUNT_HREF = "/account#saved";

/**
 * Sign-in return path. A query param survives the OAuth round trip; the
 * account page then switches to the Saved section.
 */
export const SAVED_SIGN_IN_RETURN = "/account?section=saved";

export const SAVED_SIGN_IN_INTRO = "Sign in to see your saved stories and trips.";

export function accountSectionFromLocation(hash: string, search: string): AccountSection {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(
    "section",
  );
  if (query && (ACCOUNT_SECTIONS as readonly string[]).includes(query)) {
    return query as AccountSection;
  }
  const id = hash.replace(/^#/, "");
  if ((ACCOUNT_SECTIONS as readonly string[]).includes(id)) return id as AccountSection;
  return "overview";
}

export function accountReturnPath(section: AccountSection): string {
  return section === "overview" ? "/account" : `/account?section=${section}`;
}
