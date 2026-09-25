/**
 * A save started while signed out, finished after the sign-in sheet succeeds.
 * sessionStorage survives the Google / X redirect back to this page.
 */

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const PENDING_POST_SAVE_KEY = "aj-pending-save-post";
export const PENDING_HOTEL_SAVE_KEY = "aj-pending-save-hotel";

export type PendingHotelSave = {
  hotelId: string;
  name: string;
  city: string;
  neighborhood: string;
  photo: string;
  rating: number | null;
  stars: number | null;
  destination: string;
  startDate: string;
  endDate: string;
  adults?: number;
  children?: number;
  rooms?: number;
  tripId: string;
};

function browserStore(): Store | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

function storeOr(store?: Store): Store | null {
  return store ?? browserStore();
}

export function rememberPendingPostSave(slug: string, store?: Store) {
  storeOr(store)?.setItem(PENDING_POST_SAVE_KEY, slug);
}

/** True once, when this page still owes a save for `slug`. */
export function takePendingPostSave(slug: string, store?: Store): boolean {
  const target = storeOr(store);
  if (!target || target.getItem(PENDING_POST_SAVE_KEY) !== slug) return false;
  target.removeItem(PENDING_POST_SAVE_KEY);
  return true;
}

export function forgetPendingPostSave(slug: string, store?: Store) {
  const target = storeOr(store);
  if (target?.getItem(PENDING_POST_SAVE_KEY) === slug) {
    target.removeItem(PENDING_POST_SAVE_KEY);
  }
}

export function rememberPendingHotelSave(save: PendingHotelSave, store?: Store) {
  storeOr(store)?.setItem(PENDING_HOTEL_SAVE_KEY, JSON.stringify(save));
}

export function takePendingHotelSave(
  hotelId: string,
  store?: Store,
): PendingHotelSave | null {
  const target = storeOr(store);
  if (!target) return null;
  const raw = target.getItem(PENDING_HOTEL_SAVE_KEY);
  if (!raw) return null;
  let parsed: PendingHotelSave;
  try {
    parsed = JSON.parse(raw) as PendingHotelSave;
  } catch {
    target.removeItem(PENDING_HOTEL_SAVE_KEY);
    return null;
  }
  if (!parsed || parsed.hotelId !== hotelId) return null;
  target.removeItem(PENDING_HOTEL_SAVE_KEY);
  return parsed;
}

export function forgetPendingHotelSave(hotelId: string, store?: Store) {
  const target = storeOr(store);
  if (!target) return;
  const raw = target.getItem(PENDING_HOTEL_SAVE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as PendingHotelSave;
    if (parsed?.hotelId === hotelId) target.removeItem(PENDING_HOTEL_SAVE_KEY);
  } catch {
    target.removeItem(PENDING_HOTEL_SAVE_KEY);
  }
}
