import type { Metadata } from "next";
import Link from "next/link";
import { FlightBooker } from "@/components/flights/FlightBooker";
import { FlightTripBar } from "@/components/flights/FlightTripBar";
import { SitePage } from "@/components/pages/SitePage";
import {
  flightOfferId,
  flightsPath,
  flightsQueryIssue,
  parseFlightsSearchParams,
} from "@/lib/flights";
import { verifyFlight } from "@/lib/flights-service";
import { LiteApiError, liteApiKeyInfo } from "@/lib/liteapi";
import { planATripHref } from "@/lib/trip-record";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Flight",
    description: "Fare details and sandbox booking on Alex Journeys.",
    robots: { index: false, follow: false },
    alternates: { canonical: "/flights" },
  };
}

export default async function FlightBookPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = parseFlightsSearchParams(params);
  const offerId = flightOfferId(first(params.offer));
  const planHref = planATripHref(query.tripId || null);
  const listHref = flightsPath(query);
  const configured = Boolean(liteApiKeyInfo());
  const issue = flightsQueryIssue(query);

  if (!configured || !offerId || issue) {
    const title = !configured ? "Flights not configured" : !offerId ? "Pick a flight" : "Check the trip dates";
    const body = !configured
      ? "Flight search isn’t connected on this server yet."
      : !offerId
        ? "Choose a fare from the results to see the itinerary and book it here."
        : issue || "Add the route and dates before booking.";
    return (
      <SitePage
        label="Plan a trip"
        title="Flight"
        description="Fare details for this itinerary."
        narrow={false}
        tone="default"
        compact
        crumbs={[
          { href: "/", label: "Home" },
          { href: planHref, label: "Plan a trip" },
          { href: "/flights", label: "Flights" },
          { label: "Fare" },
        ]}
      >
        <div className="plan-trip book-flow hub-follow plan-stack">
          <FlightTripBar query={query} />
          <div className="ui-card ui-card-compact flex max-w-2xl flex-col gap-2">
            <h2 className="ui-section-title">{title}</h2>
            <p className="ui-field-hint">{body}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={listHref} className="btn ui-btn btn-primary">
                Back to flights
              </Link>
              <Link href={planHref} className="btn ui-btn btn-secondary">
                {query.origin || query.destination || query.tripId ? "Back to itinerary" : "Plan a trip"}
              </Link>
            </div>
          </div>
        </div>
      </SitePage>
    );
  }

  let failure = "";
  let loaded: Awaited<ReturnType<typeof verifyFlight>> | null = null;
  try {
    loaded = await verifyFlight(offerId);
  } catch (error) {
    failure =
      error instanceof LiteApiError
        ? error.message
        : "Nuitee could not confirm this fare.";
  }

  return (
    <SitePage
      label="Plan a trip"
      title={loaded ? `${loaded.offer.airline} ${loaded.offer.originCode}–${loaded.offer.destinationCode}` : "Flight"}
      description="Fare details and booking on Alex Journeys."
      narrow={false}
      tone="default"
      compact
      crumbs={[
        { href: "/", label: "Home" },
        { href: planHref, label: "Plan a trip" },
        { href: listHref, label: "Flights" },
        { label: "Fare" },
      ]}
    >
      <div className="plan-trip book-flow hub-follow plan-stack">
        <FlightTripBar query={query} />
        {loaded?.sandbox ? (
          <p className="ui-field-hint">
            Sandbox fare. Booking finishes on Alex Journeys through Nuitee and is not a live charge.
          </p>
        ) : null}
        {failure ? (
          <div className="ui-card ui-card-compact flex max-w-2xl flex-col gap-2">
            <p className="ui-field-error" role="alert">
              {failure}
            </p>
            <Link href={listHref} className="btn ui-btn btn-primary">
              Search again
            </Link>
          </div>
        ) : null}
        {loaded ? (
          <FlightBooker
            offer={loaded.offer}
            changes={loaded.changes}
            query={query}
            sandbox={loaded.sandbox}
            listHref={listHref}
            planHref={planHref}
          />
        ) : null}
      </div>
    </SitePage>
  );
}
