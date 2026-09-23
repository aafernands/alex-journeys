"use client";

import { useState } from "react";
import Link from "next/link";
import { LocateFixed, Plane, ShieldCheck } from "lucide-react";
import { flightsPath } from "@/lib/flights";

type Props = {
  destination: string;
  placeLabel: string;
};

type Airport = {
  code: string;
  city: string;
  region: string;
  lat: number;
  lon: number;
};

const US_GATEWAYS: Airport[] = [
  { code: "EWR", city: "Newark", region: "New York area", lat: 40.6895, lon: -74.1745 },
  { code: "JFK", city: "New York", region: "New York area", lat: 40.6413, lon: -73.7781 },
  { code: "BOS", city: "Boston", region: "Northeast", lat: 42.3656, lon: -71.0096 },
  { code: "PHL", city: "Philadelphia", region: "Northeast", lat: 39.8744, lon: -75.2424 },
  { code: "IAD", city: "Washington", region: "Mid-Atlantic", lat: 38.9531, lon: -77.4565 },
  { code: "MIA", city: "Miami", region: "Florida", lat: 25.7959, lon: -80.287 },
  { code: "ATL", city: "Atlanta", region: "Southeast", lat: 33.6407, lon: -84.4277 },
  { code: "ORD", city: "Chicago", region: "Midwest", lat: 41.9742, lon: -87.9073 },
  { code: "DFW", city: "Dallas", region: "Texas", lat: 32.8998, lon: -97.0403 },
  { code: "IAH", city: "Houston", region: "Texas", lat: 29.9902, lon: -95.3368 },
  { code: "DEN", city: "Denver", region: "Mountain West", lat: 39.8561, lon: -104.6737 },
  { code: "LAX", city: "Los Angeles", region: "West Coast", lat: 33.9416, lon: -118.4085 },
  { code: "SFO", city: "San Francisco", region: "West Coast", lat: 37.6213, lon: -122.379 },
  { code: "SEA", city: "Seattle", region: "Pacific Northwest", lat: 47.4502, lon: -122.3088 },
];

const DEFAULT_CODES = ["EWR", "LAX", "IAH"];

function byCode(code: string): Airport | null {
  return US_GATEWAYS.find((airport) => airport.code === code) ?? null;
}

function distanceSquared(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const latScale = Math.cos((lat1 * Math.PI) / 180);
  const x = (lon2 - lon1) * latScale;
  const y = lat2 - lat1;
  return x * x + y * y;
}

function nearestGateway(latitude: number, longitude: number): Airport | null {
  let best: Airport | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const airport of US_GATEWAYS) {
    const distance = distanceSquared(latitude, longitude, airport.lat, airport.lon);
    if (distance < bestDistance) {
      best = airport;
      bestDistance = distance;
    }
  }

  return best;
}

function defaultOrigins(): Airport[] {
  return DEFAULT_CODES
    .map((code) => byCode(code))
    .filter((airport): airport is Airport => airport !== null);
}

export function PostFlightSuggestions({ destination, placeLabel }: Props) {
  const [nearest, setNearest] = useState<Airport | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "denied" | "unavailable">("idle");

  const defaults = defaultOrigins();
  const origins = nearest
    ? [nearest, ...defaults.filter((airport) => airport.code !== nearest.code)].slice(0, 3)
    : defaults;

  function useNearestAirport() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearest(nearestGateway(position.coords.latitude, position.coords.longitude));
        setStatus("idle");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 900000 },
    );
  }

  return (
    <section className="p-5 sm:p-6" aria-labelledby="post-flight-suggestions-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Flights
          </p>
          <h3
            id="post-flight-suggestions-title"
            className="mt-1 font-display text-xl font-bold text-heading sm:text-2xl"
          >
            Fly to {placeLabel}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Start from a major U.S. airport, then add your dates to see live flight options.
          </p>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
          <Plane className="size-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {origins.map((airport, index) => (
          <Link
            key={airport.code}
            href={flightsPath({ origin: airport.code, destination })}
            className="group flex items-center justify-between gap-4 rounded-xl bg-surface-soft px-4 py-3 transition hover:bg-surface"
          >
            <div>
              <div className="flex items-center gap-2">
                {nearest?.code === airport.code && index === 0 ? (
                  <span className="rounded-full bg-heading px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                    Near you
                  </span>
                ) : null}
                <span className="text-xs font-semibold text-muted">{airport.region}</span>
              </div>
              <p className="mt-1 font-display text-lg font-bold text-heading">
                {airport.code} <span className="text-muted">→</span> {placeLabel}
              </p>
              <p className="mt-1 text-xs text-muted">{airport.city} departure</p>
            </div>
            <Plane className="size-4 shrink-0 text-heading transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={useNearestAirport}
        disabled={status === "loading"}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-link transition hover:text-accent disabled:opacity-60"
      >
        <LocateFixed className="size-4" aria-hidden="true" />
        {status === "loading"
          ? "Finding your nearest airport…"
          : nearest
            ? "Using " + nearest.code + " near you"
            : "Use my nearest airport"}
      </button>

      {status === "denied" ? (
        <p className="mt-2 text-xs text-muted">
          Location wasn’t shared. The default U.S. gateways are still available.
        </p>
      ) : null}
      {status === "unavailable" ? (
        <p className="mt-2 text-xs text-muted">
          Location isn’t available in this browser.
        </p>
      ) : null}

      <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Location is requested only after you tap the button and is used in your browser to choose a nearby major airport.
        </span>
      </div>
    </section>
  );
}
