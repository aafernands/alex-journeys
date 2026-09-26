import type { Metadata } from "next";
import Link from "next/link";
import { FlightResults } from "@/components/flights/FlightResults";
import { FlightsSearchForm } from "@/components/flights/FlightsSearchForm";
import { SitePage } from "@/components/pages/SitePage";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  airportFieldValue,
  prefilledAirport,
  flightsQueryIssue,
  flightsQueryString,
  parseFlightsSearchParams,
  type FlightsQuery,
} from "@/lib/flights";
import { searchFlights } from "@/lib/flights-service";
import { LiteApiError, liteApiKeyInfo } from "@/lib/liteapi";
import { getTripPlannerConfig } from "@/lib/trip-planner";
import { planATripHref } from "@/lib/trip-record";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = parseFlightsSearchParams(await searchParams);
  const title =
    query.origin && query.destination
      ? `Flights ${query.origin} to ${query.destination}`
      : "Flights";
  const description =
    query.origin && query.destination
      ? `Flights from ${query.origin} to ${query.destination}, searched and booked on Alex Journeys.`
      : "Search flights for the trip you’re planning.";
  return {
    title,
    description,
    alternates: { canonical: "/flights" },
    robots: { index: !query.origin && !query.destination, follow: true },
  };
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const query: FlightsQuery = parseFlightsSearchParams(await searchParams);
  const planHref = planATripHref(query.tripId || null);
  const returnLabel = query.origin || query.destination || query.tripId ? "Back to itinerary" : "Plan a trip";
  const disclosure = getTripPlannerConfig().disclosure;
  const configured = Boolean(liteApiKeyInfo());
  const ready = Boolean(query.origin && query.destination);
  const issue = ready ? flightsQueryIssue(query) : "";

  let result: Awaited<ReturnType<typeof searchFlights>> | null = null;
  let failure = "";
  if (configured && ready && !issue) {
    try {
      result = await searchFlights(query);
    } catch (error) {
      failure =
        error instanceof LiteApiError
          ? error.message
          : "Nuitee could not search flights just now.";
    }
  }

  const route =
    query.origin && query.destination ? `${query.origin} to ${query.destination}` : "";
  const shownOrigin = result
    ? airportFieldValue(query.origin, result.origin)
    : prefilledAirport(query.origin);
  const shownDestination = result
    ? airportFieldValue(query.destination, result.destination)
    : prefilledAirport(query.destination);
  const shownQuery: FlightsQuery = {
    ...query,
    origin: shownOrigin,
    destination: shownDestination,
  };

  return (
    <SitePage
      label="Plan a trip"
      title={route ? `Flights ${route}` : "Flights"}
      description={
        route
          ? "Fares for this trip, searched and booked here."
          : "Flights for the trip you’re planning."
      }
      narrow={false}
      tone="default"
      compact
      crumbs={[
        { href: "/", label: "Home" },
        { href: planHref, label: "Plan a trip" },
        { label: "Flights" },
      ]}
    >
      <div className="plan-trip book-flow hub-follow plan-stack">
        <FlightsSearchForm
          key={flightsQueryString(shownQuery)}
          query={shownQuery}
          startCollapsed={Boolean(result)}
          backHref={planHref}
          backLabel={returnLabel}
        />
        {!configured ? (
          <EmptyState>Flight search isn’t connected on this server yet.</EmptyState>
        ) : null}
        {configured && !ready ? (
          <EmptyState>
            Flights follow the origin and destination on your trip. Set both, or type a city or airport code above.
          </EmptyState>
        ) : (
          <>
            {issue ? <p className="ui-field-hint">{issue}</p> : null}
            {failure ? (
              <p className="ui-field-error" role="alert">
                {failure}
              </p>
            ) : null}
            {result?.sandbox ? (
              <p className="ui-field-hint">
                Sandbox results from Nuitee. A booking here is a test reservation.
              </p>
            ) : null}
            {result && result.offers.length === 0 ? (
              <EmptyState>
                Nothing bookable came back for {result.origin.code} to {result.destination.code}. Shift the
                dates or try another airport.
              </EmptyState>
            ) : null}
            {result && result.offers.length > 0 ? (
              <section aria-labelledby="flight-results">
                <SectionHeader
                  id="flight-results"
                  title="Fares"
                  subtitle={`${result.offers.length} ${result.offers.length === 1 ? "fare" : "fares"} · ${result.origin.label} → ${result.destination.label}`}
                />
                <FlightResults offers={result.offers} query={query} />
              </section>
            ) : null}
          </>
        )}

        <aside aria-label="How flights are booked">
          <p className="ui-field-hint">
            Reservations on this page are completed with Nuitee. {disclosure}{" "}
            <Link href="/affiliate-disclosure" className="font-semibold text-heading underline">
              Read the full disclosure
            </Link>
            .
          </p>
        </aside>
      </div>
    </SitePage>
  );
}
