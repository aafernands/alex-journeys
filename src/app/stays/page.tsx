import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { StayFilterBar } from "@/components/stays/StayFilterBar";
import { StayResults } from "@/components/stays/StayResults";
import { StaysSearchForm } from "@/components/stays/StaysSearchForm";
import { SitePage } from "@/components/pages/SitePage";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LiteApiError, liteApiKeyInfo } from "@/lib/liteapi";
import { getTripPlannerConfig } from "@/lib/trip-planner";
import { planATripHref } from "@/lib/trip-record";
import { hasNarrowingStayFilters, stayResultsHeading } from "@/lib/stay-filters";
import {
  stayNights,
  staysQueryIssue,
  staysQueryString,
  parseStaysSearchParams,
  type StaysQuery,
} from "@/lib/stays";
import { searchStays } from "@/lib/stays-service";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = parseStaysSearchParams(await searchParams);
  const title = query.destination ? `Stays in ${query.destination}` : "Stays";
  const description = query.destination
    ? `Hotels in ${query.destination}, searched and booked on Alex Journeys.`
    : "Search hotels for the trip you’re planning.";
  return {
    title,
    description,
    alternates: { canonical: "/stays" },
    robots: { index: !query.destination, follow: true },
  };
}

export default async function StaysPage({ searchParams }: PageProps) {
  const parsed = parseStaysSearchParams(await searchParams);
  const query: StaysQuery = parsed.sessionId
    ? parsed
    : { ...parsed, sessionId: randomUUID() };
  const planHref = planATripHref(query.tripId || null);
  const returnLabel = query.destination || query.tripId ? "Back to itinerary" : "Plan a trip";
  const disclosure = getTripPlannerConfig().disclosure;
  const configured = Boolean(liteApiKeyInfo());
  const issue = query.destination ? staysQueryIssue(query) : "Add a destination.";

  let result: Awaited<ReturnType<typeof searchStays>> | null = null;
  let failure = "";
  if (configured && !issue) {
    try {
      result = await searchStays(query);
    } catch (error) {
      failure =
        error instanceof LiteApiError
          ? error.message
          : "Nuitee could not search stays just now.";
    }
  }

  const place = query.destination;

  return (
    <SitePage
      label="Plan a trip"
      title={place ? `Stays in ${place}` : "Stays"}
      description={
        place
          ? "Hotels for this stop, searched and booked here."
          : "Hotels for the trip you’re planning."
      }
      narrow={false}
      tone="default"
      compact
      crumbs={[
        { href: "/", label: "Home" },
        { href: planHref, label: "Plan a trip" },
        { label: "Stays" },
      ]}
    >
      <div className="plan-trip book-flow hub-follow plan-stack">
        {!place ? (
          <EmptyState
            action={
              <Link href={planHref} className="btn ui-btn btn-primary">
                {returnLabel}
              </Link>
            }
          >
            Stays follow the place on your trip. Set a destination and this page opens hotels for it.
          </EmptyState>
        ) : (
          <>
            <StaysSearchForm
              key={staysQueryString(query)}
              query={query}
              startCollapsed={Boolean(result)}
              backHref={planHref}
              backLabel={returnLabel}
            />
            {result ? (
              <StayFilterBar
                query={query}
                count={result.stays.length}
                priceBounds={result.priceBounds}
                amenities={result.amenities}
                propertyTypes={result.propertyTypes}
                nights={stayNights(query.startDate, query.endDate)}
              />
            ) : null}
            {!configured ? (
              <EmptyState>Hotel search isn’t connected on this server yet.</EmptyState>
            ) : null}
            {configured && issue ? <p className="ui-field-hint">{issue}</p> : null}
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
            {result && result.stays.length === 0 ? (
              <EmptyState>
                {hasNarrowingStayFilters(query.filters)
                  ? `Nothing in this search for ${result.placeName} fits the filters. Clear them to see the full list.`
                  : `Nothing bookable came back for ${result.placeName}. Shift the dates and search again.`}
              </EmptyState>
            ) : null}
            {result && result.stays.length > 0 ? (
              <section aria-labelledby="hotel-results">
                <SectionHeader
                  id="hotel-results"
                  title={stayResultsHeading(query.filters.sort)}
                  subtitle={`${result.stays.length} ${result.stays.length === 1 ? "property" : "properties"} · totals for your dates`}
                />
                <StayResults stays={result.stays} query={query} />
              </section>
            ) : null}
          </>
        )}

        <aside aria-label="Affiliate disclosure">
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
