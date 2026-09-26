import Link from "next/link";
import { stayBookingBar } from "@/lib/stays-itinerary";
import type { StaysQuery } from "@/lib/stays";

export function StayTripBar({ query }: { query: StaysQuery }) {
  const bar = stayBookingBar(query);
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
