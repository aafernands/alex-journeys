import type { Metadata } from "next";
import Link from "next/link";
import { StayConfirmation } from "@/components/stays/StayConfirmation";
import { StayTripBar } from "@/components/stays/StayTripBar";
import { SitePage } from "@/components/pages/SitePage";
import {
  stayConfirmationFromParams,
  parseStaysSearchParams,
  staysPath,
} from "@/lib/stays";
import { planATripHref } from "@/lib/trip-record";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stay booked",
  description: "Confirmation for a stay booked on Alex Journeys.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/stays" },
};

export default async function StayConfirmationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = parseStaysSearchParams(params);
  const confirmation = stayConfirmationFromParams(params);
  const planHref = planATripHref(query.tripId || null);
  const listHref = staysPath(query);
  const title = confirmation?.hotelName || "Stay booked";

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
        { href: listHref, label: "Stays" },
        { label: "Confirmation" },
      ]}
    >
      <div className="plan-trip book-flow hub-follow plan-stack">
        <StayTripBar query={query} />
        {confirmation ? (
          <StayConfirmation
            confirmation={confirmation}
            listHref={listHref}
            planHref={planHref}
            itinerary="added"
            saved="local"
          />
        ) : (
          <div className="ui-card ui-card-compact flex max-w-2xl flex-col gap-2">
            <h2 className="ui-section-title">Reservation details unavailable</h2>
            <p className="ui-field-hint">This confirmation link is missing its reservation number.</p>
            <Link href={planHref} className="btn ui-btn btn-primary">
              Back to itinerary
            </Link>
          </div>
        )}
      </div>
    </SitePage>
  );
}
