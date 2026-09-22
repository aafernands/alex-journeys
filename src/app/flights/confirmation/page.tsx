import type { Metadata } from "next";
import { FlightConfirmationScreen } from "@/components/flights/FlightConfirmationScreen";
import { FlightTripBar } from "@/components/flights/FlightTripBar";
import { SitePage } from "@/components/pages/SitePage";
import {
  flightConfirmationFromParams,
  flightsPath,
  parseFlightsSearchParams,
} from "@/lib/flights";
import { planATripHref } from "@/lib/trip-record";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Flight booked",
    description: "Confirmation for a flight booked on Fernandes Journeys.",
    robots: { index: false, follow: false },
    alternates: { canonical: "/flights" },
  };
}

export default async function FlightConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = parseFlightsSearchParams(params);
  const confirmation = flightConfirmationFromParams(params);
  const planHref = planATripHref(query.tripId || null);
  const listHref = flightsPath(query);
  const title = confirmation?.title && confirmation.title !== "Flight" ? confirmation.title : "Flight booked";

  return (
    <SitePage
      label="Plan a trip"
      title={title}
      description="This reservation is booked."
      narrow={false}
      tone="default"
      compact
      crumbs={[
        { href: "/", label: "Home" },
        { href: planHref, label: "Plan a trip" },
        { href: listHref, label: "Flights" },
        { label: "Confirmation" },
      ]}
    >
      <div className="plan-trip hub-follow plan-stack">
        <FlightTripBar query={query} />
        <FlightConfirmationScreen
          confirmation={confirmation}
          query={query}
          listHref={listHref}
          planHref={planHref}
        />
      </div>
    </SitePage>
  );
}
