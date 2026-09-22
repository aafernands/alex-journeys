"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlightConfirmation } from "@/components/flights/FlightConfirmation";
import {
  flightConfirmationPath,
  type FlightConfirmationDetails,
  type FlightsQuery,
} from "@/lib/flights";
import {
  bookedFlightFromConfirmation,
  commitBookedFlight,
  flightTripContext,
  readStoredFlightConfirmation,
  rememberFlightConfirmation,
  resolveFlightConfirmation,
  type FlightCommitResult,
} from "@/lib/flights-itinerary";

type ItineraryState = "adding" | "added" | "missing";

type Props = {
  confirmation: FlightConfirmationDetails | null;
  query: FlightsQuery;
  listHref: string;
  planHref: string;
  /** Leave checkout and land on the confirmation URL. */
  redirect?: boolean;
};

export function FlightConfirmationScreen({
  confirmation,
  query,
  listHref,
  planHref,
  redirect = false,
}: Props) {
  const router = useRouter();
  const [details, setDetails] = useState(confirmation);
  const [ready, setReady] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryState>(confirmation ? "adding" : "missing");
  const [returnHref, setReturnHref] = useState(planHref);
  const [savedAs, setSavedAs] = useState<Exclude<FlightCommitResult, { ok: false }>["saved"]>(
    "local",
  );

  const applyCommit = useCallback((result: FlightCommitResult) => {
    if (!result.ok) {
      setItinerary("missing");
      return;
    }
    setReturnHref(result.href);
    setSavedAs(result.saved);
    setItinerary("added");
  }, []);

  useEffect(() => {
    if (confirmation) {
      const resolved =
        resolveFlightConfirmation(
          confirmation,
          readStoredFlightConfirmation(confirmation.bookingId),
        ) ?? confirmation;
      rememberFlightConfirmation(resolved);
      setDetails(resolved);
    }
    setReady(true);
  }, [confirmation]);

  useEffect(() => {
    if (!ready || !details) return;
    const href = flightConfirmationPath(details, query);
    let cancelled = false;
    void commitBookedFlight(
      bookedFlightFromConfirmation(details, href),
      flightTripContext(query),
    ).then((result) => {
      if (!cancelled) applyCommit(result);
    });
    if (redirect && window.location.pathname !== "/flights/confirmation") {
      router.replace(href);
    }
    return () => {
      cancelled = true;
    };
  }, [applyCommit, details, query, ready, redirect, router]);

  function addToItinerary() {
    if (!details || itinerary === "adding") return;
    setItinerary("adding");
    void commitBookedFlight(
      bookedFlightFromConfirmation(details, flightConfirmationPath(details, query)),
      flightTripContext(query),
    ).then(applyCommit);
  }

  if (!details) {
    return (
      <section className="panel plan-inset plan-stack p-5 sm:p-6" aria-labelledby="flight-confirmation-missing">
        <p className="eyebrow">Reservation</p>
        <h2 id="flight-confirmation-missing" className="font-display text-2xl font-bold text-heading">
          That confirmation isn’t in this browser
        </h2>
        <p className="text-sm leading-relaxed text-text">
          Open the flight from the trip where you booked it, or search again.
        </p>
        <div className="plan-actions plan-sticky plan-sticky-page">
          <Link href={planHref} className="btn btn-primary">
            View on itinerary
          </Link>
          <Link href={listHref} className="btn btn-secondary">
            Search more flights
          </Link>
        </div>
      </section>
    );
  }

  return (
    <FlightConfirmation
      confirmation={details}
      listHref={listHref}
      planHref={returnHref}
      itinerary={itinerary}
      saved={savedAs}
      onAddToItinerary={addToItinerary}
    />
  );
}
