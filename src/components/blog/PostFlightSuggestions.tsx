"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LocateFixed, MapPin, Plane, ShieldCheck } from "lucide-react";
import { flightsPath, primaryAirportFor } from "@/lib/flights";

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

const DEFAULT_ORIGINS = ["EWR", "LAX", "IAH"] as const;

function airportByCode(code: string): Airport {
  return US_GATEWAYS.find((airport) => airport.code === code) ?? US_GATEWAYS[0]!;
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthMiles = 3958.8;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthMiles * Math.asin(Math.sqrt(a));
}

function nearestGateway(latitude: number, longitude: number): Airport {
  return [...US_GATEWAYS].sort(
    (a, b) =>
      distanceMiles(latitude, longitude, a.lat, a.lon) -
      distanceMiles(latitude, longitude, b.lat, b.lon),
  )[0]!;
}

export function PostFlightSuggestions({ destination, placeLabel }: Props) {
  const [nearest, setNearest] = useState<Airport | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied" | "unavailable">("idle");

  const destinationAirport = primaryAirportFor(destination);
  const destinationCode = destinationAirport?.code ?? "";

  const origins = useMemo(() => {
    const defaults = DEFAULT_ORIGINS.map(airportByCode);
    if (!nearest) return defaults;

    const unique = [nearest, ...defaults].filter(
      (airport, index, all) => all.findIndex((item) => item.code === airport.code) === index,
    );
    return unique.slice(0, 3);
  }, [nearest]);

  function useLocation() {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }

    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearest(
          nearestGateway(position.coords.latitude, position.coords.longitude),
        );
        setLocationState("idle");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 15 * 60 * 1000 },
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
            Start a flight search to {placeLabel}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Pick a U.S. gateway to prefill the route. Add your dates on the next screen
            to see live Nuitee flight options.
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
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {nearest?.code === airport.code && index === 0 ? (
                  <span className="rounded-full bg-heading px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                    Near you
                  </span>
                ) : null}
                <span className="text-xs font-semibold text-muted">{airport.region}</span>
              </div>
              <p className="mt-1 font-display text-lg font-bold text-heading">
                {airport.code}
                <span className="mx-2 text-muted" aria-hidden="true">→</span>
                {destinationCode || placeLabel}
              </p>
              <p className="mt-1 text-xs text-muted">
                {airport.city} to {placeLabel}
              </p>
            </div>
            <Plane className="size-4 shrink-0 text-heading transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={useLocation}
          disabled={locationState === "loading"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-link transition hover:text-accent disabled:opacity-60"
        >
          <LocateFixed className="size-4" aria-hidden="true" />
          {locationState === "loading"
            ? "Finding your nearest airport…"
            : nearest
              ? "Using " + nearest.code + " near you"
              : "Use my nearest airport"}
        </button>
        {locationState === "denied" ? (
          <span className="text-xs text-muted">Location wasn’t shared. The default routes still work.</span>
        ) : null}
        {locationState === "unavailable" ? (
          <span className="text-xs text-muted">Location isn’t available in this browser.</span>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface-soft px-3 py-2.5 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Location is requested only after you tap the button and is used in your browser
          to choose a nearby major U.S. airport.
        </span>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <MapPin className="size-3.5" aria-hidden="true" />
        These are route shortcuts, not live fares. Dates are required before prices can be shown.
      </p>
    </section>
  );
}
