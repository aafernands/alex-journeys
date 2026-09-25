/**
 * Booking routes are a focused task (search, rooms, checkout, confirmation).
 * The Plan a trip landing stays a discovery page and is not included.
 */
export function isFocusedBookingPath(pathname: string): boolean {
  return /^\/(stays|flights)(\/|$)/.test(pathname);
}
