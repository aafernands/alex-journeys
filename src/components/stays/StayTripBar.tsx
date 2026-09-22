import Link from "next/link";
import { stayBookingBar } from "@/lib/stays-itinerary";
import type { StaysQuery } from "@/lib/stays";

export function StayTripBar({ query }: { query: StaysQuery }) {
  const bar = stayBookingBar(query);
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
