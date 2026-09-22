import type { Metadata } from "next";
import Link from "next/link";
import { FlightTripBar } from "@/components/flights/FlightTripBar";
import { FlightsSearchForm } from "@/components/flights/FlightsSearchForm";
import { SitePage } from "@/components/pages/SitePage";
import {
  FLIGHT_CABIN_LABEL,
  flightDateLabel,
  flightDayOffset,
  flightsBookPath,
  flightsQueryIssue,
  flightsQueryString,
  formatFlightClock,
  formatFlightDuration,
  formatFlightMoney,
  parseFlightsSearchParams,
  stopsLabel,
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
      ? `Flights from ${query.origin} to ${query.destination}, searched and booked on Fernandes Journeys.`
      : "Search flights for the trip you’re planning.";
  return {
    title,
    description,
    alternates: { canonical: "/flights" },
    robots: { index: !query.origin && !query.destination, follow: true },
  };
}

function Notice({
  title,
  body,
  planHref,
  actionLabel,
}: {
  title: string;
  body: string;
  planHref: string;
  actionLabel: string;
}) {
  return (
    <div className="panel hub-follow max-w-2xl p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold tracking-tight text-heading">{title}</h2>
      <p className="mt-3 text-text">{body}</p>
      <Link href={planHref} className="btn btn-primary mt-6 inline-flex">
        {actionLabel}
      </Link>
    </div>
  );
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
      <div className="plan-trip hub-follow plan-stack">
        <FlightTripBar query={query} />
        <FlightsSearchForm key={flightsQueryString(query)} query={query} />
        {!configured ? (
          <Notice
            title="Flights not configured"
            body="Flight search isn’t connected on this server yet."
            planHref={planHref}
            actionLabel={returnLabel}
          />
        ) : null}
        {configured && !ready ? (
          <Notice
            title="Add a route"
            body="Flights follow the origin and destination on your trip. Set both, or type a city or airport code above."
            planHref={planHref}
            actionLabel={returnLabel}
          />
        ) : (
          <>
            {issue ? (
              <p className="text-sm font-semibold text-heading">{issue}</p>
            ) : null}
            {failure ? (
              <p className="text-sm font-semibold text-link" role="alert">
                {failure}
              </p>
            ) : null}
            {result?.sandbox ? (
              <p className="text-sm text-muted">
                Sandbox results from Nuitee. A booking here is a test reservation.
              </p>
            ) : null}
            {result ? (
              <p className="text-sm font-semibold text-heading">
                {[
                  `${result.origin.label} → ${result.destination.label}`,
                  flightDateLabel({
                    departureTime: query.startDate,
                    returnDepartureTime: query.endDate,
                  }),
                  `${query.adults} ${query.adults === 1 ? "adult" : "adults"}`,
                  query.children > 0
                    ? `${query.children} ${query.children === 1 ? "child" : "children"}`
                    : "",
                  FLIGHT_CABIN_LABEL[query.cabin],
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {result && result.offers.length === 0 ? (
              <div className="panel plan-inset max-w-2xl p-6">
                <h2 className="font-display text-xl font-bold text-heading">No flights for these dates</h2>
                <p className="mt-2 text-sm leading-relaxed text-text">
                  Nothing bookable came back for {result.origin.code} to {result.destination.code}. Shift
                  the dates or try another airport.
                </p>
              </div>
            ) : null}
            {result && result.offers.length > 0 ? (
              <ul className="plan-stack">
                {result.offers.map((offer) => {
                  const offset = flightDayOffset(offer.departureTime, offer.arrivalTime);
                  const meta = [
                    formatFlightDuration(offer.durationMinutes),
                    stopsLabel(offer.outboundStops),
                    offer.cabin,
                    offer.baggage,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={offer.offerId}>
                      <article className="panel plan-inset flex h-full flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 plan-stack-tight">
                          <p className="text-sm font-semibold text-heading">
                            {offer.airline}
                            {offer.cheapest ? (
                              <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                                Cheapest
                              </span>
                            ) : null}
                          </p>
                          <p className="font-display text-2xl font-bold text-heading">
                            {formatFlightClock(offer.departureTime) || offer.originCode}
                            <span className="px-2 text-base text-muted">–</span>
                            {formatFlightClock(offer.arrivalTime) || offer.destinationCode}
                            {offset > 0 ? (
                              <span className="ml-1 text-sm text-muted">+{offset}</span>
                            ) : null}
                          </p>
                          <p className="text-sm text-muted">
                            {offer.originCode} → {offer.destinationCode}
                            {offer.returnDepartureTime
                              ? ` · return ${formatFlightClock(offer.returnDepartureTime) || "scheduled"}`
                              : ""}
                          </p>
                          {meta ? <p className="text-sm text-text">{meta}</p> : null}
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                          <p className="font-semibold text-heading">
                            {offer.price ? formatFlightMoney(offer.price) : "Price on request"}
                          </p>
                          <Link
                            href={flightsBookPath(offer.offerId, query)}
                            className="btn btn-primary inline-flex"
                          >
                            View fare
                          </Link>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        )}

        <aside className="panel-soft px-5 py-4" aria-label="How flights are booked">
          <p className="text-sm leading-relaxed text-text">
            Reservations on this page are completed with Nuitee. {disclosure}{" "}
            <Link href="/affiliate-disclosure" className="text-link hover:text-accent">
              Read the full disclosure
            </Link>
            .
          </p>
        </aside>
      </div>
    </SitePage>
  );
}
