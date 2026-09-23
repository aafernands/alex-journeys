import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StayBooker } from "@/components/stays/StayBooker";
import { StayDetailSearch } from "@/components/stays/StayDetailSearch";
import { StayHotelOverview } from "@/components/stays/StayHotelOverview";
import { StayTripBar } from "@/components/stays/StayTripBar";
import { SitePage } from "@/components/pages/SitePage";
import { LiteApiError, liteApiKeyInfo } from "@/lib/liteapi";
import { planATripHref } from "@/lib/trip-record";
import {
  formatStayRating,
  isStayHotelId,
  parseStaysSearchParams,
  staysHotelPath,
  staysPath,
  staysQueryIssue,
} from "@/lib/stays";
import { loadStayHotel } from "@/lib/stays-service";

type PageProps = {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { hotelId } = await params;
  const query = parseStaysSearchParams(await searchParams);
  const title = query.destination ? `Stay in ${query.destination}` : "Stay";
  return {
    title,
    description: "Room rates and sandbox booking on Fernandes Journeys.",
    robots: { index: false, follow: false },
    alternates: {
      canonical: isStayHotelId(hotelId) ? `/stays/${hotelId}` : "/stays",
    },
  };
}

export default async function StayHotelPage({ params, searchParams }: PageProps) {
  const { hotelId } = await params;
  if (!isStayHotelId(hotelId)) notFound();
  const query = parseStaysSearchParams(await searchParams);
  const planHref = planATripHref(query.tripId || null);
  const onTrip = Boolean(query.destination || query.tripId);
  const listHref = staysPath(query);
  const configured = Boolean(liteApiKeyInfo());
  const issue = staysQueryIssue(query);

  if (!configured || issue) {
    return (
      <SitePage
        label="Plan a trip"
        title="Stay"
        description="Room rates for this hotel."
        narrow={false}
        tone="default"
        compact
        crumbs={[
          { href: "/", label: "Home" },
          { href: planHref, label: "Plan a trip" },
          { href: listHref, label: "Stays" },
          { label: "Hotel" },
        ]}
      >
        <div className="plan-trip hub-follow plan-stack">
          <StayTripBar query={query} />
          <div className="panel max-w-2xl p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-heading">
              {configured ? "Add trip dates" : "Stays not configured"}
            </h2>
            <p className="mt-3 text-text">
              {configured
                ? issue
                : "Hotel search isn’t connected on this server yet."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={planHref} className="btn btn-primary inline-flex">
                {onTrip ? "Back to itinerary" : "Plan a trip"}
              </Link>
              <Link href={listHref} className="btn btn-secondary inline-flex">
                Search more stays
              </Link>
            </div>
          </div>
        </div>
      </SitePage>
    );
  }

  let failure = "";
  let loaded: Awaited<ReturnType<typeof loadStayHotel>> | null = null;
  try {
    loaded = await loadStayHotel(hotelId, query);
  } catch (error) {
    failure =
      error instanceof LiteApiError
        ? error.message
        : "Nuitee could not load this hotel.";
  }

  const hotel = loaded?.hotel;
  const name = hotel?.name || "This stay";
  const rating = formatStayRating(hotel?.rating ?? null);
  const meta = [hotel?.neighborhood, hotel?.city, rating ? `${rating} guest rating` : "", hotel?.stars ? `${hotel.stars}-star` : ""]
    .filter(Boolean)
    .join(" · ");

  if (loaded && hotel) {
    return (
      <StayHotelOverview
        hotel={hotel}
        reviews={loaded.reviews}
        rooms={loaded.rooms}
        listHref={listHref}
        sandbox={loaded.sandbox}
        failure={failure}
        tripBar={<StayDetailSearch hotelId={hotelId} query={query} />}
      >
        <StayBooker
          hotelId={hotel.id || hotelId}
          hotelName={name}
          rooms={loaded.rooms}
          fallbackPhoto={hotel.photos[0]?.url ?? ""}
          query={query}
          sandbox={loaded.sandbox}
          stayHref={staysHotelPath(hotelId, query)}
          listHref={listHref}
          planHref={planHref}
        />
      </StayHotelOverview>
    );
  }

  return (
    <SitePage
      label="Plan a trip"
      title={name}
      description={meta || "Room rates for this hotel."}
      narrow={false}
      tone="default"
      compact
      crumbs={[
        { href: "/", label: "Home" },
        { href: planHref, label: "Plan a trip" },
        { href: listHref, label: "Stays" },
        { label: name },
      ]}
    >
      <div className="plan-trip hub-follow plan-stack">
        <StayTripBar query={query} />
        {failure ? (
          <p className="text-sm font-semibold text-link" role="alert">
            {failure}
          </p>
        ) : null}
        <Link href={listHref} className="btn btn-secondary inline-flex self-start">
          Search more stays
        </Link>
      </div>
    </SitePage>
  );
}
