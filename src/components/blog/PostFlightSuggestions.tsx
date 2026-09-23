"use client";

import { useState } from "react";
import Link from "next/link";
import { LocateFixed, Plane } from "lucide-react";
import { flightsPath } from "@/lib/flights";

type Props = {
  destination: string;
  placeLabel: string;
};

type Airport = {
  code: string;
  city: string;
  lat: number;
  lon: number;
};

const US_GATEWAYS: Airport[] = [
  { code: "EWR", city: "Newark", lat: 40.6895, lon: -74.1745 },
  { code: "JFK", city: "New York", lat: 40.6413, lon: -73.7781 },
  { code: "BOS", city: "Boston", lat: 42.3656, lon: -71.0096 },
  { code: "PHL", city: "Philadelphia", lat: 39.8744, lon: -75.2424 },
  { code: "IAD", city: "Washington", lat: 38.9531, lon: -77.4565 },
  { code: "MIA", city: "Miami", lat: 25.7959, lon: -80.287 },
  { code: "ATL", city: "Atlanta", lat: 33.6407, lon: -84.4277 },
  { code: "ORD", city: "Chicago", lat: 41.9742, lon: -87.9073 },
  { code: "DFW", city: "Dallas", lat: 32.8998, lon: -97.0403 },
  { code: "IAH", city: "Houston", lat: 29.9902, lon: -95.3368 },
  { code: "DEN", city: "Denver", lat: 39.8561, lon: -104.6737 },
  { code: "LAX", city: "Los Angeles", lat: 33.9416, lon: -118.4085 },
  { code: "SFO", city: "San Francisco", lat: 37.6213, lon: -122.379 },
  { code: "SEA", city: "Seattle", lat: 47.4502, lon: -122.3088 },
];

const DEFAULT_CODES = ["EWR", "LAX", "IAH"] as const;

function defaultAirports(): Airport[] {
  const result: Airport[] = [];
  for (const code of DEFAULT_CODES) {
    const airport = US_GATEWAYS.find((item) => item.code === code);
    if (airport) result.push(airport);
  }
  return result;
}

function nearestAirport(latitude: number, longitude: number): Airport | null {
  let nearest: Airport | null = null;
  let best = Number.POSITIVE_INFINITY;

  for (const airport of US_GATEWAYS) {
    const latDelta = airport.lat - latitude;
    const lonDelta = airport.lon - longitude;
    const distance = latDelta * latDelta + lonDelta * lonDelta;
    if (distance < best) {
      best = distance;
      nearest = airport;
    }
  }

  return nearest;
}

export function PostFlightSuggestions({ destination, placeLabel }: Props) {
  const [nearby, setNearby] = useState<Airport | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "denied" | "unavailable"
  >("idle");

  const defaults = defaultAirports();
  const routes = nearby
    ? [nearby, ...defaults.filter((airport) => airport.code !== nearby.code)].slice(0, 3)
    : defaults;

  function requestNearestAirport() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearby(
          nearestAirport(
            position.coords.latitude,
            position.coords.longitude,
          ),
        );
        setLocationStatus("idle");
      },
      () => setLocationStatus("denied"),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 900000,
      },
    );
  }

  return (
    <section className="p-5 sm:p-6" aria-labelledby="post-flight-routes-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Flights
          </p>
          <h3
            id="post-flight-routes-title"
            className="mt-1 font-display text-xl font-bold text-heading sm:text-2xl"
          >
            Fly to {placeLabel}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Choose a starting airport. Your destination is already filled in.
          </p>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
          <Plane className="size-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {routes.map((airport, index) => (
          <Link
            key={airport.code}
            href={flightsPath({ origin: airport.code, destination })}
            className="group flex items-center justify-between gap-4 rounded-xl bg-surface-soft px-4 py-3 transition hover:bg-surface"
          >
            <div>
              {nearby && index === 0 && nearby.code === airport.code ? (
                <span className="rounded-full bg-heading px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                  Near you
                </span>
              ) : null}
              <p className="mt-1 font-display text-lg font-bold text-heading">
                {airport.code} <span className="text-muted">→</span> {placeLabel}
              </p>
              <p className="mt-1 text-xs text-muted">{airport.city}</p>
            </div>
            <Plane
              className="size-4 shrink-0 text-heading transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={requestNearestAirport}
        disabled={locationStatus === "loading"}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-link transition hover:text-accent disabled:opacity-60"
      >
        <LocateFixed className="size-4" aria-hidden="true" />
        {locationStatus === "loading"
          ? "Finding your nearest airport…"
          : nearby
            ? "Using " + nearby.code + " near you"
            : "Use my nearest airport"}
      </button>

      {locationStatus === "denied" ? (
        <p className="mt-2 text-xs text-muted">
          Location wasn’t shared. You can still use the default routes above.
        </p>
      ) : null}
      {locationStatus === "unavailable" ? (
        <p className="mt-2 text-xs text-muted">
          Location isn’t available in this browser.
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Add travel dates on the flight search page to see live Nuitee fares.
      </p>
    </section>
  );
}
