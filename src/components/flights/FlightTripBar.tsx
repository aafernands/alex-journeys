import Link from "next/link";
import { flightBookingBar } from "@/lib/flights-itinerary";
import type { FlightsQuery } from "@/lib/flights";

export function FlightTripBar({ query }: { query: FlightsQuery }) {
  const bar = flightBookingBar(query);
  if (!bar) return null;
  return (
    <div
      className="panel plan-inset flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      role="region"
      aria-label="Trip"
    >
      <p className="text-sm font-semibold text-heading">{bar.label}</p>
      <Link href={bar.backHref} className="btn btn-secondary">
        {bar.backLabel}
      </Link>
    </div>
  );
}
