import {
  DEFAULT_PARTNERS,
  resolveAffiliateHref,
  type TripUrlValues,
} from "@/lib/trip-planner-model";
import type { StaysQuery } from "@/lib/stays";

/** Affiliate compare URLs. Booking deep-links when the trip has dates. */
export function stayCompareUrls(query: StaysQuery): {
  booking: string;
  expedia: string;
} {
  const values: TripUrlValues = {
    destination: query.destination || undefined,
    startDate: query.startDate || undefined,
    endDate: query.endDate || undefined,
    adults: String(query.adults || 2),
    rooms: String(query.rooms || 1),
  };
  const booking = DEFAULT_PARTNERS.find((partner) => partner.key === "booking");
  const expedia = DEFAULT_PARTNERS.find((partner) => partner.key === "expedia");
  return {
    booking: booking ? resolveAffiliateHref(booking, values) : "",
    expedia: expedia ? resolveAffiliateHref(expedia, values) : "",
  };
}
