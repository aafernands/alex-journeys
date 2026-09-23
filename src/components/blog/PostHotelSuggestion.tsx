"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BedDouble, Building2, ChevronRight, MapPin, Star } from "lucide-react";
import { staysPath } from "@/lib/stays";

type HotelSuggestion = {
  id: string;
  name: string;
  photo: string;
  rating: number | null;
  reviewCount: number;
  stars: number | null;
  neighborhood: string;
  city: string;
  facilities: string[];
};

type Props = {
  destination: string;
  placeLabel: string;
};

function ratingLabel(value: number | null): string {
  if (value == null) return "";
  const normalized = value <= 5 ? value * 2 : value;
  if (normalized >= 9) return "Exceptional";
  if (normalized >= 8) return "Very good";
  if (normalized >= 7) return "Good";
  return "Guest rated";
}

function displayRating(value: number | null): string {
  if (value == null) return "";
  const normalized = value <= 5 ? value * 2 : value;
  return normalized.toFixed(1).replace(".0", "");
}

export function PostHotelSuggestion({ destination, placeLabel }: Props) {
  const [hotel, setHotel] = useState<HotelSuggestion | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const res = await fetch(
          `/api/stays/suggestion?dest=${encodeURIComponent(destination)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { hotel?: HotelSuggestion | null };
        if (active) setHotel(data.hotel ?? null);
      } catch {
        // The editorial card keeps its generic fallback if Nuitee is unavailable.
      } finally {
        if (active) setLoaded(true);
      }
    }

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [destination]);

  const stars = useMemo(
    () => Math.max(0, Math.min(5, Math.round(hotel?.stars ?? 0))),
    [hotel?.stars],
  );
  const rating = displayRating(hotel?.rating ?? null);
  const location = [hotel?.neighborhood, hotel?.city].filter(Boolean).join(" · ");
  const searchHref = staysPath({ destination });

  if (!loaded) {
    return (
      <section className="p-5 sm:p-6" aria-label="Finding a hotel suggestion">
        <div className="animate-pulse">
          <div className="h-40 rounded-xl bg-surface" />
          <div className="mt-4 h-3 w-20 rounded bg-surface" />
          <div className="mt-3 h-6 w-2/3 rounded bg-surface" />
          <div className="mt-3 h-4 w-1/2 rounded bg-surface" />
        </div>
      </section>
    );
  }

  if (!hotel) {
    return (
      <section className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
            <BedDouble className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Stays
            </p>
            <h3 className="mt-1 font-display text-xl font-bold text-heading sm:text-2xl">
              Stay in {placeLabel}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Browse hotels and add your dates to see live room rates.
            </p>
            <Link
              href={searchHref}
              className="mt-5 inline-flex items-center gap-1.5 font-semibold text-link transition hover:text-accent"
            >
              Explore hotels
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-5 sm:p-6" aria-labelledby="post-hotel-suggestion-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Hotel suggestion
          </p>
          <h3
            id="post-hotel-suggestion-title"
            className="mt-1 font-display text-xl font-bold text-heading sm:text-2xl"
          >
            A stay to consider in {placeLabel}
          </h3>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
          <BedDouble className="size-5" aria-hidden="true" />
        </div>
      </div>

      <article className="mt-5 overflow-hidden rounded-xl border border-border bg-white">
        {hotel.photo ? (
          // Hotel CDN hosts vary, so keep this as a normal image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.photo}
            alt={hotel.name}
            className="h-48 w-full object-cover"
          />
        ) : (
          <div className="h-36 bg-surface" aria-hidden="true" />
        )}

        <div className="p-4">
          {stars > 0 ? (
            <div className="flex gap-0.5 text-heading" aria-label={`${stars} star hotel`}>
              {Array.from({ length: stars }, (_, index) => (
                <Star key={index} className="size-3.5 fill-current" aria-hidden="true" />
              ))}
            </div>
          ) : null}

          <h4 className="mt-2 font-display text-lg font-bold leading-tight text-heading">
            {hotel.name}
          </h4>

          {location ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {location}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {rating ? (
              <>
                <span className="rounded-md bg-heading px-2 py-1 text-sm font-bold text-white">
                  {rating}
                </span>
                <span className="text-sm font-semibold text-heading">
                  {ratingLabel(hotel.rating)}
                </span>
                {hotel.reviewCount > 0 ? (
                  <span className="text-xs text-muted">
                    {hotel.reviewCount.toLocaleString()} reviews
                  </span>
                ) : null}
              </>
            ) : null}
          </div>

          {hotel.facilities.length > 0 ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {hotel.facilities.slice(0, 4).map((facility) => (
                <li key={facility} className="flex items-start gap-2 text-sm text-text">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden="true" />
                  <span>{facility}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs leading-relaxed text-muted">
              Hotel details are from Nuitee. Add your dates next to check live room availability and pricing.
            </p>
            <Link
              href={searchHref}
              className="mt-3 inline-flex items-center gap-1.5 font-semibold text-link transition hover:text-accent"
            >
              Check rooms & rates
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
