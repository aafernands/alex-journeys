import Link from "next/link";
import { BedDouble, Plane } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AccountBookingRow } from "@/lib/account-journey";
import { planATripHref } from "@/lib/trip-record";

type Props = { bookings: AccountBookingRow[] };

/** Stays and flights reserved inside saved trips. */
export function AccountBookingsList({ bookings }: Props) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        action={
          <span className="flex flex-wrap gap-2">
            <Link href="/stays" className="btn btn-secondary">
              Find a stay
            </Link>
            <Link href="/flights" className="btn btn-secondary">
              Find flights
            </Link>
          </span>
        }
      >
        Stays and flights you book or mark as booked in a trip show up here.
      </EmptyState>
    );
  }
  return (
    <ul className="ui-card divide-y divide-border p-0">
      {bookings.map((booking) => {
        const Icon = booking.kind === "stay" ? BedDouble : Plane;
        const meta = [booking.when, booking.tripTitle].filter(Boolean).join(" · ");
        return (
          <li key={booking.id}>
            <Link
              href={planATripHref(booking.tripId)}
              className="flex min-h-12 items-center gap-3 px-3 py-2 transition hover:bg-surface-soft"
            >
              <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-heading">
                  {booking.title}
                </span>
                {meta ? <span className="block truncate text-xs text-muted">{meta}</span> : null}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-ds-caption text-muted">
                  {booking.kind === "stay" ? "Stay" : "Flight"}
                </span>
                {booking.confirmation ? (
                  <span className="block max-w-[7rem] truncate font-mono text-xs text-heading">
                    {booking.confirmation}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
