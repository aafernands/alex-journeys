import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BedDouble } from "lucide-react";
import { StayBooker } from "@/components/stays/StayBooker";
import { LiteApiError, liteApiKeyInfo } from "@/lib/liteapi";
import { planATripHref } from "@/lib/trip-record";
import {
  isStayHotelId,
  isStayOfferId,
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

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export const metadata: Metadata = {
  title: "Review your room",
  description: "Review the selected hotel room and complete your stay booking.",
  robots: { index: false, follow: false },
};

export default async function StayCheckoutPage({ params, searchParams }: PageProps) {
  const { hotelId } = await params;
  if (!isStayHotelId(hotelId)) notFound();

  const raw = await searchParams;
  const query = parseStaysSearchParams(raw);
  const offerId = firstParam(raw, "offer").trim();
  const listHref = staysPath(query);
  const hotelHref = staysHotelPath(hotelId, query);
  const planHref = planATripHref(query.tripId || null);

  if (!isStayOfferId(offerId)) redirect(`${hotelHref}#rooms`);

  const configured = Boolean(liteApiKeyInfo());
  const issue = staysQueryIssue(query);
  if (!configured || issue) redirect(hotelHref);

  let loaded: Awaited<ReturnType<typeof loadStayHotel>> | null = null;
  let failure = "";
  try {
    loaded = await loadStayHotel(hotelId, query);
  } catch (error) {
    failure =
      error instanceof LiteApiError
        ? error.message
        : "Nuitee could not load this room.";
  }

  const hotel = loaded?.hotel;
  if (!loaded || !hotel) {
    return (
      <main className="book-flow bg-bg pb-16" data-density="compact">
        <div className="section-shell pt-3">
          <div className="mx-auto max-w-4xl">
            <Link href={hotelHref} className="ui-row-action">
              Back to hotel
            </Link>
            <section className="ui-card ui-card-compact mt-3 flex flex-col gap-2">
              <h1 className="ui-section-title">Room unavailable</h1>
              <p className="ui-field-hint">
                {failure || "We could not reload this hotel. Return to the room list and try again."}
              </p>
              <Link href={hotelHref} className="btn ui-btn btn-primary">
                Choose another room
              </Link>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="book-flow bg-bg pb-16" data-density="compact">
      <div className="section-shell pt-3">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Checkout navigation">
            <Link href={`${hotelHref}#rooms`} className="ui-row-action">
              Back to rooms
            </Link>
          </nav>

          <section className="mt-2 border-b border-border pb-3">
            <h1 className="ui-section-title">Review your room</h1>
            <p className="ui-field-hint mt-1">
              {hotel.name}. We’ll confirm the latest rate with Nuitee before you enter guest details.
            </p>
          </section>

          <section className="py-3" aria-label="Selected room checkout">
            <StayBooker
              hotelId={hotel.id || hotelId}
              hotelName={hotel.name}
              rooms={loaded.rooms}
              fallbackPhoto={hotel.photos[0]?.url ?? ""}
              query={query}
              sandbox={loaded.sandbox}
              stayHref={hotelHref}
              listHref={listHref}
              planHref={planHref}
              checkoutMode
              selectedOfferId={offerId}
              hotelHref={hotelHref}
            />
          </section>

          <aside className="flex items-start gap-2 border-t border-border pt-3 text-sm text-muted">
            <BedDouble className="mt-0.5 h-5 w-5 shrink-0 text-heading" aria-hidden="true" />
            <p>
              Need a different room? Go back to the hotel without losing your dates or traveler details.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
