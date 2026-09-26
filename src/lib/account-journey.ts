/**
 * Server-side summaries for My Journey (/account): bookings pulled from saved
 * trips and packing progress per trip. Pure helpers; no Firestore access.
 */
import { packingProgress, readPackingList } from "@/lib/packing-list";
import type { TripItem, TripRecord } from "@/lib/trip-record";

export type AccountBookingKind = "stay" | "flight";

export type AccountBookingRow = {
  id: string;
  tripId: string;
  tripTitle: string;
  kind: AccountBookingKind;
  title: string;
  /** Short date range, e.g. "Nov 10 – Nov 14". Empty when the item has no dates. */
  when: string;
  confirmation: string;
  booked: boolean;
  /** Sort key: first date on the booking, `YYYY-MM-DD`, or "". */
  sortDate: string;
};

export type AccountPackingRow = {
  tripId: string;
  tripTitle: string;
  packed: number;
  total: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(value: string | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) return "";
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${Number(match[3])}` : "";
}

function range(start: string | undefined, end: string | undefined): string {
  const a = shortDate(start);
  const b = shortDate(end);
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b;
}

function tripTitle(trip: TripRecord): string {
  return trip.title?.trim() || trip.destination?.trim() || "Trip";
}

function bookingFromItem(trip: TripRecord, item: TripItem): AccountBookingRow | null {
  const kind: AccountBookingKind | null =
    item.type === "hotel" ? "stay" : item.type === "flight" ? "flight" : null;
  if (!kind) return null;
  const booked = item.status === "booked";
  const confirmation = item.confirmation?.trim() ?? "";
  // A booking is something reserved: marked booked, or carrying a confirmation code.
  if (!booked && !confirmation) return null;
  const start = kind === "stay" ? item.checkinDate : item.departureDate;
  const end = kind === "stay" ? item.checkoutDate : item.returnDate;
  return {
    id: `${trip.id}:${item.id}`,
    tripId: trip.id,
    tripTitle: tripTitle(trip),
    kind,
    title: item.title?.trim() || (kind === "stay" ? "Stay" : "Flight"),
    when: range(start, end),
    confirmation,
    booked,
    sortDate: start?.trim() || end?.trim() || "",
  };
}

/** Stays and flights reserved across the reader's saved trips, soonest first. */
export function accountBookings(trips: TripRecord[]): AccountBookingRow[] {
  const rows: AccountBookingRow[] = [];
  for (const trip of trips) {
    for (const item of trip.items ?? []) {
      const row = bookingFromItem(trip, item);
      if (row) rows.push(row);
    }
  }
  return rows.sort((a, b) => {
    if (a.sortDate && b.sortDate) return a.sortDate.localeCompare(b.sortDate);
    if (a.sortDate) return -1;
    if (b.sortDate) return 1;
    return a.title.localeCompare(b.title);
  });
}

/** Packing progress for each saved trip that has a list. */
export function accountPackingLists(trips: TripRecord[]): AccountPackingRow[] {
  const rows: AccountPackingRow[] = [];
  for (const trip of trips) {
    const notes = trip.packingNotes ?? "";
    if (!notes.trim()) continue;
    const list = readPackingList(notes);
    if (list.unreadable) continue;
    const { packed, total } = packingProgress(list.items);
    if (total === 0) continue;
    rows.push({ tripId: trip.id, tripTitle: tripTitle(trip), packed, total });
  }
  return rows;
}
