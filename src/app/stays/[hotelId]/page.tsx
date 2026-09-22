import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StayBooker } from "@/components/stays/StayBooker";
import { StayCompareLinks } from "@/components/stays/StayCompareLinks";
import { StayTripBar } from "@/components/stays/StayTripBar";
import { SitePage } from "@/components/pages/SitePage";
import { LiteApiError, liteApiKeyInfo } from "@/lib/liteapi";
import { stayCompareUrls } from "@/lib/stays-compare";
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
  const listHref = staysPath(query);
  const compare = stayCompareUrls(query);
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
          { href: "/stays", label: "Stays" },
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
              : "Hotel search isn’t connected on this server yet. You can still compare on Booking or Expedia."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={listHref} className="btn btn-primary inline-flex">
              Back to stays
            </Link>
            <Link href={planHref} className="btn btn-secondary inline-flex">
              {query.destination || query.tripId ? "Back to itinerary" : "Plan a trip"}
            </Link>
          </div>
          <div className="mt-4">
            <StayCompareLinks bookingHref={compare.booking} expediaHref={compare.expedia} />
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
        <StayCompareLinks bookingHref={compare.booking} expediaHref={compare.expedia} />
        {loaded?.sandbox ? (
          <p className="text-sm text-muted">
            Sandbox rate. Booking finishes on Fernandes Journeys through Nuitee and is not a live charge.
          </p>
        ) : null}
        {failure ? (
          <p className="text-sm font-semibold text-link" role="alert">
            {failure}
          </p>
        ) : null}
        {hotel?.photos?.length ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {hotel.photos.slice(0, 4).map((photo) => (
              <li key={photo.url} className="overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || ""}
                  className="h-32 w-full object-cover sm:h-40"
                />
              </li>
            ))}
          </ul>
        ) : null}
        {hotel?.description ? (
          <p className="max-w-3xl text-sm leading-relaxed text-text">{hotel.description}</p>
        ) : null}
        {hotel && (hotel.checkIn || hotel.facilities.length > 0) ? (
          <p className="text-sm text-muted">
            {[
              hotel.checkIn ? `Check-in ${hotel.checkIn}` : "",
              hotel.checkOut ? `Check-out ${hotel.checkOut}` : "",
              hotel.facilities.slice(0, 6).join(" · "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {loaded ? (
          <StayBooker
            hotelId={hotel?.id || hotelId}
            hotelName={name}
            rooms={loaded.rooms}
            query={query}
            sandbox={loaded.sandbox}
            stayHref={staysHotelPath(hotelId, query)}
            listHref={listHref}
            planHref={planHref}
          />
        ) : (
          <Link href={listHref} className="btn btn-secondary inline-flex self-start">
            Back to stays
          </Link>
        )}
      </div>
    </SitePage>
  );
}
