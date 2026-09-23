import type { Metadata } from "next";
import Link from "next/link";
import { ExperiencesViatorMount } from "@/components/experiences/ExperiencesViatorMount";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { SitePage } from "@/components/pages/SitePage";
import { getViatorExperiencesConfig } from "@/lib/experiences-config";
import {
  buildExperiencesWidget,
  parseExperiencesSearchParams,
  viatorExperiencesSearchUrl,
  type ExperiencesQuery,
} from "@/lib/experiences";
import { getTripPlannerConfig } from "@/lib/trip-planner";
import { planATripHref } from "@/lib/trip-record";
import { formatDateRange } from "@/lib/trip-planner-model";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function tripContext(query: ExperiencesQuery): string {
  const parts: string[] = [];
  if (query.startDate && query.endDate) {
    parts.push(formatDateRange(query.startDate, query.endDate));
  } else if (query.startDate) {
    parts.push(formatDateRange(query.startDate, query.startDate).replace(/(\d+)–\1/, "$1"));
  }
  const people: string[] = [];
  if (query.adults) {
    people.push(`${query.adults} ${query.adults === 1 ? "adult" : "adults"}`);
  }
  if (query.children) {
    people.push(
      `${query.children} ${query.children === 1 ? "child" : "children"}`,
    );
  }
  if (people.length > 0) parts.push(people.join(", "));
  return parts.join(" · ");
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const query = parseExperiencesSearchParams(await searchParams);
  const title = query.destination
    ? `Experiences in ${query.destination}`
    : "Experiences";
  const description = query.destination
    ? `Tours and things to do in ${query.destination}.`
    : "Tours and activities for the trip you’re planning!";
  return {
    title,
    description,
    alternates: { canonical: "/experiences" },
    openGraph: {
      title,
      description,
      type: "website",
      url: "/experiences",
    },
  };
}

export default async function ExperiencesPage({ searchParams }: PageProps) {
  const query = parseExperiencesSearchParams(await searchParams);
  const settings = getViatorExperiencesConfig();
  const disclosure = getTripPlannerConfig().disclosure;
  const place = query.destination;
  const context = tripContext(query);
  const markup = buildExperiencesWidget(query, settings);
  const searchUrl = place
    ? viatorExperiencesSearchUrl(place, settings.partnerId, settings.campaign)
    : "";
  const planHref = planATripHref();

  return (
    <SitePage
      label="Plan a trip"
      title={place ? `Experiences in ${place}` : "Experiences"}
      description={
        place
          ? "Tours and things to do for this stop, from Viator."
          : "Tours and activities for the trip you’re planning!"
      }
      narrow={false}
      tone="default"
      crumbs={[
        { href: "/", label: "Home" },
        { href: planHref, label: "Plan a trip" },
        { label: "Experiences" },
      ]}
    >
      {place ? (
        <div className="hub-follow">
          {context ? (
            <p className="text-sm font-semibold text-heading">{context}</p>
          ) : null}
          <div className={context ? "mt-4" : ""}>
            <ExperiencesViatorMount markup={markup} ready={settings.widgetReady} />
          </div>
          {searchUrl ? (
            <p className={settings.widgetReady ? "mt-4" : "mt-6"}>
              <OutboundLink
                href={searchUrl}
                affiliate
                className={
                  settings.widgetReady
                    ? "text-sm font-semibold text-link hover:text-accent"
                    : "btn btn-primary inline-flex"
                }
              >
                {settings.widgetReady
                  ? `See more ${place} experiences on Viator`
                  : `Browse ${place} experiences on Viator`}
                <span className="sr-only"> (opens in a new tab)</span>
              </OutboundLink>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="panel hub-follow max-w-2xl p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-heading">
            Add a destination in Plan a Trip
          </h2>
          <p className="mt-3 text-text">
            Experiences follow the place on your trip. Set a destination and
            this page opens tours and activities for it.
          </p>
          <Link href={planHref} className="btn btn-primary mt-6 inline-flex">
            Plan a trip
          </Link>
        </div>
      )}

      <aside
        className="panel-soft hub-follow px-5 py-4"
        aria-label="Affiliate disclosure"
      >
        <p className="text-sm leading-relaxed text-text">
          {disclosure}{" "}
          <Link href="/affiliate-disclosure" className="text-link hover:text-accent">
            Read the full disclosure
          </Link>
          .
        </p>
      </aside>
    </SitePage>
  );
}
