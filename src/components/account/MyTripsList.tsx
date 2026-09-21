"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { planATripHref } from "@/lib/trip-record";

export type AccountTripRow = {
  id: string;
  title: string;
  destination: string;
  dates: string;
};

type Props = {
  trips: AccountTripRow[];
};

/** Account dashboard list of saved itineraries. */
export function MyTripsList({ trips }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(trips);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(trips);
  }, [trips]);

  const remove = async (id: string) => {
    const trip = items.find((item) => item.id === id);
    const ok = window.confirm(
      trip ? `Remove “${trip.title}” from your account?` : "Remove this trip?",
    );
    if (!ok) return;

    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.status === 503) {
        setError("Trips are temporarily unavailable.");
        return;
      }
      if (!res.ok) {
        setError("Could not remove that trip.");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setPendingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="panel p-6 md:p-8">
        <p className="text-sm leading-relaxed text-text">
          No saved trips yet. Plan a trip, then sign in to keep the itinerary
          here.
        </p>
        <Link href={planATripHref()} className="btn btn-primary mt-6">
          Plan a trip
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-link" role="status">
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((trip) => (
          <li key={trip.id} className="panel p-4 md:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-heading">
                  {trip.title}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {[trip.destination, trip.dates].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={planATripHref(trip.id)} className="btn btn-secondary">
                  Open
                </Link>
                <button
                  type="button"
                  className="text-sm font-semibold text-muted transition hover:text-accent disabled:opacity-60"
                  disabled={pendingId === trip.id}
                  onClick={() => void remove(trip.id)}
                >
                  {pendingId === trip.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
