import { validateDetails, type PlannerState } from "@/lib/trip-planner-model";
import type { TripItem } from "@/lib/trip-record";

/** Booking categories are optional; the itinerary itself is useful without them. */
export function validateTripSetup(state: PlannerState, flexibleOn: boolean) {
  return validateDetails(state, flexibleOn);
}

/** A saved possibility is not a confirmed booking. */
export function bookingProgress(
  items: readonly Pick<TripItem, "status">[],
): string {
  if (items.length === 0) return "Not added";
  const booked = items.filter((item) => item.status === "booked").length;
  const planned = items.filter((item) => item.status === "todo").length;
  if (booked && planned) return `${booked} booked · ${planned} planned`;
  if (planned) return "Planned";
  return booked ? "Booked" : "Not needed";
}
