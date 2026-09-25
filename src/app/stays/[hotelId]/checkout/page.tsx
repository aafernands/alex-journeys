import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BedDouble, ShieldCheck } from "lucide-react";
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
      <main className="bg-bg pb-16">
        <div className="section-shell pt-5 sm:pt-7">
          <div className="mx-auto max-w-4xl">
            <Link href={hotelHref} className="text-sm font-semibold text-link hover:text-accent">
              ← Back to hotel
            </Link>
            <section className="mt-6 rounded-xl border border-line bg-white p-6 sm:p-8">
              <h1 className="font-display text-2xl font-bold text-heading">Room unavailable</h1>
              <p className="mt-3 text-sm leading-6 text-text">
                {failure || "We could not reload this hotel. Return to the room list and try again."}
              </p>
              <Link href={hotelHref} className="btn btn-primary mt-6 inline-flex">
                Choose another room
              </Link>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-bg pb-20">
      <div className="section-shell pt-5 sm:pt-7">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Checkout navigation" className="text-sm text-muted">
            <Link href={`${hotelHref}#rooms`} className="font-semibold text-link hover:text-accent">
              ← Back to rooms
            </Link>
          </nav>

          <section className="mt-5 border-b border-line pb-7 sm:pb-9">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="eyebrow">Secure stay checkout</p>
                <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl">
                  Review your room
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                  {hotel.name}. We’ll confirm the latest rate with Nuitee before you enter guest details.
                </p>
              </div>
              <div className="hidden items-center gap-2 text-sm font-semibold text-heading lg:flex">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                Rate verified before booking
              </div>
            </div>
          </section>

          <section className="py-7 sm:py-9" aria-label="Selected room checkout">
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

          <aside className="flex items-start gap-3 border-t border-line pt-6 text-sm leading-6 text-muted">
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
