import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { MapPin, Star } from "lucide-react";
import { StayTripBar } from "@/components/stays/StayTripBar";
import { StaysSearchForm } from "@/components/stays/StaysSearchForm";
import { SitePage } from "@/components/pages/SitePage";
import { LiteApiError, liteApiKeyInfo } from "@/lib/liteapi";
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
    ? `Hotels in ${query.destination}, searched and booked on Alex Journeys.`
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
      <div className="plan-trip hub-follow plan-stack">
        <StayTripBar query={query} />
        {!place ? (
          <Notice
            title="Add a destination in Plan a Trip"
            body="Stays follow the place on your trip. Set a destination and this page opens hotels for it."
            planHref={planHref}
            actionLabel={returnLabel}
          />
        ) : (
          <>
            <StaysSearchForm key={staysQueryString(query)} query={query} />
            {!configured ? (
              <Notice
                title="Stays not configured"
                body="Hotel search isn’t connected on this server yet."
                planHref={planHref}
                actionLabel={returnLabel}
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
              <p className="rounded-lg bg-surface px-4 py-3 text-sm text-muted">
                Sandbox results from Nuitee. A booking here is a test reservation.
              </p>
            ) : null}
            {result && result.stays.length === 0 ? (
              <div className="panel plan-inset max-w-2xl p-6">
                <h2 className="font-display text-xl font-bold text-heading">No stays for these dates</h2>
                <p className="mt-2 text-sm leading-relaxed text-text">
                  Nothing bookable came back for {result.placeName}. Shift the dates and search again.
                </p>
              </div>
            ) : null}
            {result && result.stays.length > 0 ? (
              <section aria-labelledby="hotel-results" className="max-w-6xl">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted">{result.stays.length} properties</p>
                    <h2 id="hotel-results" className="mt-1 font-display text-2xl font-bold text-heading">
                      Recommended stays
                    </h2>
                  </div>
                  <p className="hidden text-sm text-muted sm:block">Prices shown for your selected dates</p>
                </div>
                <ul className="space-y-4">
                {result.stays.map((stay) => {
                  const rating = formatStayRating(stay.rating);
                  const stars = Math.max(0, Math.min(5, Math.round(stay.stars ?? 0)));
                  return (
                    <li key={stay.id}>
                      <article className="group overflow-hidden rounded-xl border border-line bg-white transition hover:border-border-strong hover:shadow-md md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
                        {stay.photo ? (
                          // Hotel CDNs are not a fixed host list, so this stays a plain image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={stay.photo}
                            alt={stay.name}
                            className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.02] md:h-full md:min-h-56"
                          />
                        ) : (
                          <div className="h-52 bg-surface md:h-full md:min-h-56" aria-hidden="true" />
                        )}
                        <div className="flex min-w-0 flex-col p-5">
                          {stars > 0 ? (
                            <div className="mb-2 flex gap-0.5 text-heading" aria-label={`${stars} star hotel`}>
                              {Array.from({ length: stars }, (_, index) => (
                                <Star key={index} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                              ))}
                            </div>
                          ) : null}
                          <h3 className="font-display text-xl font-bold leading-tight text-heading">{stay.name}</h3>
                          {stay.neighborhood || stay.city ? (
                            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                              {[stay.neighborhood, stay.city].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                          <div className="mt-5 flex flex-1 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              {rating ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="rounded-md bg-heading px-2 py-1 font-bold text-white">{rating}</span>
                                  <span className="font-semibold text-heading">Guest rating</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="sm:text-right">
                              <p className="text-xs text-muted">Total for selected dates</p>
                              <p className="mt-1 font-display text-2xl font-bold text-heading">
                                {stay.fromPrice ? formatStayMoney(stay.fromPrice) : "Price on request"}
                              </p>
                              <Link
                                href={staysHotelPath(stay.id, query)}
                                className="btn btn-primary mt-3 w-full sm:w-auto"
                              >
                                View rooms
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
                </ul>
              </section>
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
