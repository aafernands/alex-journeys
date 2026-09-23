"use client";

import Link from "next/link";
import { Heart, MapPin, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type SavedHotelRow = {
  hotelId: string;
  name: string;
  city: string;
  neighborhood: string;
  photo: string;
  rating: number | null;
  stars: number | null;
  savedAt: string;
  href: string;
};

export function SavedHotelsList({ hotels }: { hotels: SavedHotelRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(hotels);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setItems(hotels), [hotels]);

  async function remove(hotelId: string) {
    setError("");
    setPendingId(hotelId);
    try {
      const response = await fetch("/api/saved-hotels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      });
      if (!response.ok) {
        setError("Could not remove that hotel.");
        return;
      }
      setItems((current) => current.filter((hotel) => hotel.hotelId !== hotelId));
      router.refresh();
    } catch {
      setError("Could not remove that hotel.");
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="panel p-6 md:p-8">
        <Heart className="h-6 w-6 text-accent" aria-hidden="true" />
        <h3 className="mt-3 font-display text-lg font-bold text-heading">
          No favorite hotels yet
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text">
          Open a hotel and tap <strong>Save hotel</strong>. It will appear here on your account.
        </p>
        <Link href="/stays" className="btn btn-primary mt-6 inline-flex">
          Find hotels
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((hotel) => {
          const location = [hotel.neighborhood, hotel.city].filter(Boolean).join(" · ");
          return (
            <article key={hotel.hotelId} className="overflow-hidden rounded-xl border border-border bg-white">
              <Link href={hotel.href} className="block bg-surface">
                {hotel.photo ? (
                  // Nuitee hotel photo hosts are dynamic.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hotel.photo}
                    alt=""
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-44 place-items-center text-sm text-muted">No photo</div>
                )}
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={hotel.href} className="font-display text-lg font-bold text-heading hover:text-accent">
                      {hotel.name}
                    </Link>
                    {location ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {location}
                      </p>
                    ) : null}
                  </div>
                  {hotel.rating != null ? (
                    <span className="shrink-0 rounded-md bg-heading px-2 py-1 text-xs font-bold text-white">
                      {hotel.rating.toFixed(1)}
                    </span>
                  ) : hotel.stars ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-heading">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      {hotel.stars}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Link href={hotel.href} className="text-sm font-semibold text-link hover:text-accent">
                    View hotel
                  </Link>
                  <button
                    type="button"
                    onClick={() => void remove(hotel.hotelId)}
                    disabled={pendingId === hotel.hotelId}
                    className="text-sm font-semibold text-muted hover:text-accent disabled:opacity-60"
                  >
                    {pendingId === hotel.hotelId ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-sm text-red-600" role="status">{error}</p> : null}
    </div>
  );
}
