/**
 * Focused trip chrome: hide the mobile tab bar and the travel-alerts ticker
 * for the whole trip planner and for in-app booking flows.
 * Blog and other discovery pages keep both.
 */

const PLAN_A_TRIP_PATH = "/guides/plan-a-trip";
/** On-site Premium checkout is a focused task too. */
const PREMIUM_JOIN_PATH = "/premium/join";

/**
 * Phones and small tablets. iPad portrait (768px) and desktop keep the
 * section tabs at the top of the open trip.
 */
export const TRIP_SECTION_BAR_QUERY = "(max-width: 767px)";

export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

function searchParams(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

/**
 * In-app booking routes reached from a trip's lanes.
 * Stays and flights include search, hotel/offer, checkout, and confirmation.
 * Experiences is the in-app Viator lane.
 */
export function isFocusedBookingPath(pathname: string): boolean {
  return /^\/(stays|flights|experiences)(\/|$)/.test(normalizePathname(pathname));
}

/**
 * Paths that hide discovery chrome from the URL alone.
 * Every `/guides/plan-a-trip` state is inside the planner: blank setup,
 * later steps, edit details, and a saved `?trip=`. Car and other partner
 * hops use `/out?from=trip`.
 */
export function isFocusedTripChrome(pathname: string, search = ""): boolean {
  const path = normalizePathname(pathname);
  if (isFocusedBookingPath(path)) return true;
  if (path === PLAN_A_TRIP_PATH) return true;
  if (path === PREMIUM_JOIN_PATH) return true;
  const params = searchParams(search);
  if (path === "/out" && params.get("from") === "trip") return true;
  return false;
}

/**
 * Runs in <head> before paint so a phone never flashes the tab bar.
 * Kept in sync with `isFocusedTripChrome`.
 */
export const TRIP_FOCUS_BOOT = `(function(){try{var p=location.pathname||"/";if(p.length>1&&p.charAt(p.length-1)==="/")p=p.slice(0,-1);var q=new URLSearchParams(location.search);var focus=/^\\/(stays|flights|experiences)(\\/|$)/.test(p);if(!focus&&p==="/out"&&q.get("from")==="trip")focus=true;if(!focus&&(p==="${PLAN_A_TRIP_PATH}"||p==="${PREMIUM_JOIN_PATH}"))focus=true;if(focus)document.documentElement.classList.add("trip-focus");}catch(e){}})();`;
