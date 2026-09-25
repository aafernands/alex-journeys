/**
 * Focused trip chrome: hide the mobile tab bar and the travel-alerts ticker.
 * The Plan a trip landing (no saved trip, setup still in progress) stays a
 * discovery page.
 */

const PLAN_A_TRIP_PATH = "/guides/plan-a-trip";
const ACTIVE_PLAN_KEY = "fj.plan-a-trip.active.v1";

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
 * Paths that are focused from the URL alone (no local draft required).
 * Saved trips use `/guides/plan-a-trip?trip=`. Car and other partner hops
 * use `/out?from=trip`.
 */
export function isFocusedTripChrome(pathname: string, search = ""): boolean {
  const path = normalizePathname(pathname);
  if (isFocusedBookingPath(path)) return true;
  const params = searchParams(search);
  if (path === "/out" && params.get("from") === "trip") return true;
  if (path === PLAN_A_TRIP_PATH && params.has("trip")) return true;
  return false;
}

/** Open itinerary stored on this device (step 4), even without `?trip=`. */
export function isStoredTripWorkspace(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(ACTIVE_PLAN_KEY);
    if (!raw) return false;
    const plan = JSON.parse(raw) as { step?: unknown };
    return plan?.step === 4;
  } catch {
    return false;
  }
}

/**
 * Runs in <head> before paint so a phone never flashes the tab bar.
 * Kept in sync with `isFocusedTripChrome` and the stored step-4 workspace.
 */
export const TRIP_FOCUS_BOOT = `(function(){try{var p=location.pathname||"/";if(p.length>1&&p.charAt(p.length-1)==="/")p=p.slice(0,-1);var q=new URLSearchParams(location.search);var focus=/^\\/(stays|flights|experiences)(\\/|$)/.test(p);if(!focus&&p==="/out"&&q.get("from")==="trip")focus=true;if(!focus&&p==="${PLAN_A_TRIP_PATH}"){if(q.has("trip"))focus=true;else{var raw=localStorage.getItem("${ACTIVE_PLAN_KEY}");var plan=raw&&JSON.parse(raw);if(plan&&plan.step===4)focus=true;}}if(focus)document.documentElement.classList.add("trip-focus");}catch(e){}})();`;
