import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { StayCompareLinks } from "@/components/stays/StayCompareLinks";
import { StayTripBar } from "@/components/stays/StayTripBar";
import { StaysSearchForm } from "@/components/stays/StaysSearchForm";
import { SitePage } from "@/components/pages/SitePage";
import { LiteApiError, liteApiKeyInfo } from "@/lib/liteapi";
import { stayCompareUrls } from "@/lib/stays-compare";
import { getTripPlannerConfig } from "@/lib/trip-planner";
import { planATripHref } from "@/lib/trip-record";
import {
  formatStayMoney,
  formatStayRating,
  staysHotelPath,
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
    ? `Hotels in ${query.destination}, searched and booked on Fernandes Journeys.`
    : "Search hotels for the trip you’re planning.";
  return {
    title,
    description,
    alternates: { canonical: "/stays" },
    robots: { index: !query.destination, follow: true },
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

export default async function StaysPage({ searchParams }: PageProps) {
  const parsed = parseStaysSearchParams(await searchParams);
  const query: StaysQuery = parsed.sessionId
    ? parsed
    : { ...parsed, sessionId: randomUUID() };
  const planHref = planATripHref(query.tripId || null);
  const compare = stayCompareUrls(query);
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
          ? "Hotels for this stop, searched here. Booking and Expedia stay available to compare."
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
      <div className="plan-trip hub-follow plan-stack">
        <StayTripBar query={query} />
        {!place ? (
          <Notice
            title="Add a destination in Plan a Trip"
            body="Stays follow the place on your trip. Set a destination and this page opens hotels for it."
            planHref={planHref}
            actionLabel={query.tripId ? "Back to itinerary" : "Plan a trip"}
          />
        ) : (
          <>
            <StaysSearchForm key={staysQueryString(query)} query={query} />
            <StayCompareLinks bookingHref={compare.booking} expediaHref={compare.expedia} />
            {!configured ? (
              <Notice
                title="Stays not configured"
                body="Hotel search isn’t connected on this server yet. You can still compare the same dates on Booking or Expedia."
                planHref={planHref}
                actionLabel="Back to itinerary"
              />
            ) : null}
            {configured && issue ? (
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
            {result && result.stays.length === 0 ? (
              <div className="panel plan-inset max-w-2xl p-6">
                <h2 className="font-display text-xl font-bold text-heading">No stays for these dates</h2>
                <p className="mt-2 text-sm leading-relaxed text-text">
                  Nothing bookable came back for {result.placeName}. Shift the dates, or compare on Booking.
                </p>
              </div>
            ) : null}
            {result && result.stays.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.stays.map((stay) => {
                  const rating = formatStayRating(stay.rating);
                  const meta = [
                    stay.neighborhood,
                    rating ? `${rating} guest rating` : "",
                    stay.stars ? `${stay.stars}-star` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={stay.id}>
                      <article className="panel plan-inset flex h-full flex-col overflow-hidden">
                        {stay.photo ? (
                          // Hotel CDNs are not a fixed host list, so this stays a plain image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={stay.photo}
                            alt=""
                            className="h-44 w-full object-cover"
                          />
                        ) : (
                          <div className="h-44 bg-surface" aria-hidden="true" />
                        )}
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <h2 className="font-display text-lg font-bold text-heading">{stay.name}</h2>
                          {meta ? <p className="text-sm text-muted">{meta}</p> : null}
                          <p className="mt-auto font-semibold text-heading">
                            {stay.fromPrice
                              ? `From ${formatStayMoney(stay.fromPrice)}`
                              : "Price on request"}
                          </p>
                          <Link
                            href={staysHotelPath(stay.id, query)}
                            className="btn btn-primary mt-2 inline-flex self-start"
                          >
                            View rooms
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

        <aside className="panel-soft px-5 py-4" aria-label="Affiliate disclosure">
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
