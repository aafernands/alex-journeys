import Link from "next/link";
import { flightBookingBar } from "@/lib/flights-itinerary";
import type { FlightsQuery } from "@/lib/flights";

export function FlightTripBar({ query }: { query: FlightsQuery }) {
  const bar = flightBookingBar(query);
  if (!bar) return null;
  return (
    <div className="flex items-center justify-between gap-2" role="region" aria-label="Trip">
      <p className="min-w-0 truncate ui-field-hint">{bar.label}</p>
      <Link href={bar.backHref} className="ui-row-action">
        {bar.backLabel}
      </Link>
    </div>
  );
}
