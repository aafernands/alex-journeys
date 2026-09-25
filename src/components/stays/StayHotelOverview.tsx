import type { ReactNode } from "react";
import { StayPhotoGallery } from "@/components/stays/StayPhotoGallery";
import { SaveHotelButton } from "@/components/stays/SaveHotelButton";
import Link from "next/link";
import {
  Accessibility,
  BedDouble,
  Car,
  ChevronRight,
  Clock3,
  Coffee,
  Dumbbell,
  MapPin,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  UtensilsCrossed,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import {
  formatStayMoney,
  formatStayRating,
  type StayHotelContent,
  type StayReviewSummary,
  type StayRoomOffer,
} from "@/lib/stays";

type Props = {
  hotel: StayHotelContent;
  reviews: StayReviewSummary;
  rooms: StayRoomOffer[];
  children: ReactNode;
  tripBar?: ReactNode;
  failure?: string;
  listHref: string;
  sandbox: boolean;
  saveTripContext?: {
    destination: string;
    startDate: string;
    endDate: string;
    adults: number;
    children: number;
    rooms: number;
    tripId: string;
  };
};

function FacilityIcon({ label, className = "h-5 w-5" }: { label: string; className?: string }) {
  const value = label.toLowerCase();
  let Icon: LucideIcon = Sparkles;
  if (/wifi|internet/.test(value)) Icon = Wifi;
  else if (/pool|beach|ocean|water/.test(value)) Icon = Waves;
  else if (/parking|car|garage/.test(value)) Icon = Car;
  else if (/restaurant|dining|food|bar/.test(value)) Icon = UtensilsCrossed;
  else if (/breakfast|coffee/.test(value)) Icon = Coffee;
  else if (/gym|fitness/.test(value)) Icon = Dumbbell;
  else if (/air condition|climate/.test(value)) Icon = Snowflake;
  else if (/accessib|wheelchair/.test(value)) Icon = Accessibility;
  return <Icon className={className} aria-hidden="true" />;
}

function ratingLabel(score: number | null) {
  if (score == null) return "";
  const normalized = score <= 5 ? score * 2 : score;
  if (normalized >= 9) return "Exceptional";
  if (normalized >= 8) return "Very good";
  if (normalized >= 7) return "Good";
  if (normalized >= 6) return "Pleasant";
  return "Guest rated";
}

function reviewScore(hotel: StayHotelContent, reviews: StayReviewSummary) {
  return reviews.average ?? hotel.rating;
}

function mapHref(hotel: StayHotelContent) {
  if (hotel.latitude != null && hotel.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${hotel.latitude},${hotel.longitude}`;
  }
  const query = [hotel.address, hotel.city, hotel.country].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

function mapEmbedHref(hotel: StayHotelContent) {
  const query =
    hotel.latitude != null && hotel.longitude != null
      ? `${hotel.latitude},${hotel.longitude}`
      : [hotel.address, hotel.city, hotel.country].filter(Boolean).join(", ");
  return query
    ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
    : "";
}

function topFacilities(facilities: string[]) {
  const priority = [
    /beach|ocean/i,
    /pool/i,
    /breakfast/i,
    /parking/i,
    /wifi|internet/i,
    /restaurant|dining/i,
    /gym|fitness/i,
    /air condition/i,
  ];
  const output: string[] = [];
  for (const pattern of priority) {
    const match = facilities.find((item) => pattern.test(item));
    if (match && !output.includes(match)) output.push(match);
  }
  for (const item of facilities) {
    if (!output.includes(item)) output.push(item);
    if (output.length >= 8) break;
  }
  return output.slice(0, 8);
}

function highlights(hotel: StayHotelContent, reviews: StayReviewSummary) {
  const items: Array<{ title: string; detail: string }> = [];
  for (const pro of reviews.pros.slice(0, 3)) {
    items.push({ title: pro, detail: "Mentioned positively in recent guest feedback." });
  }

  if (items.length < 3) {
    for (const facility of topFacilities(hotel.facilities)) {
      if (items.some((item) => item.title.toLowerCase() === facility.toLowerCase())) continue;
      items.push({ title: facility, detail: "Available at this property." });
      if (items.length >= 3) break;
    }
  }

  if (items.length < 3 && hotel.neighborhood) {
    items.push({ title: hotel.neighborhood, detail: "Property location." });
  }
  return items.slice(0, 3);
}

export function StayHotelOverview({
  hotel,
  reviews,
  rooms,
  children,
  tripBar,
  failure,
  listHref,
  sandbox,
  saveTripContext,
}: Props) {
  const score = reviewScore(hotel, reviews);
  const scoreText = formatStayRating(score);
  const totalReviews = hotel.reviewCount || reviews.count;
  const amenities = topFacilities(hotel.facilities);
  const hotelHighlights = highlights(hotel, reviews);
  const locationHref = mapHref(hotel);
  const mapEmbed = mapEmbedHref(hotel);
  const fromPrice = rooms.find((room) => room.price)?.price ?? null;
  const fromPriceLabel = fromPrice ? formatStayMoney(fromPrice) : "";
  const stars = Math.max(0, Math.min(5, Math.round(hotel.stars ?? 0)));
  const fullAddress = [hotel.address, hotel.city, hotel.country].filter(Boolean).join(", ");
  const hasStayDates = Boolean(saveTripContext?.startDate && saveTripContext?.endDate);

  return (
    <main className="bg-bg pb-28 md:pb-16">
      <div className="section-shell pt-4 sm:pt-6">
        {failure ? (
          <p className="mb-4 text-sm font-semibold text-link" role="alert">
            {failure}
          </p>
        ) : null}
        <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
          <Link href={listHref} className="text-link transition hover:text-accent">
            ← Back to stays
          </Link>
        </nav>
        {tripBar ? <div className="mb-4">{tripBar}</div> : null}

        <StayPhotoGallery photos={hotel.photos} hotelName={hotel.name} />

        <div className="mx-auto max-w-6xl">
          <section id="overview" className="scroll-mt-28 border-b border-line py-7 sm:py-9">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                {stars > 0 ? (
                  <div className="mb-3 flex items-center gap-1 text-heading" aria-label={`${stars} star hotel`}>
                    {Array.from({ length: stars }, (_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
                    ))}
                  </div>
                ) : null}
                <h1 className="font-display text-3xl font-bold leading-tight text-heading sm:text-4xl lg:text-5xl">
                  {hotel.name}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text">
                  {scoreText ? (
                    <a href="#reviews" className="inline-flex items-center gap-2 rounded-lg transition hover:bg-surface-soft">
                      <span className="rounded-md bg-heading px-2 py-1 font-bold text-white">{scoreText}</span>
                      <span>
                        <strong>{ratingLabel(score)}</strong>
                        {totalReviews > 0 ? ` · ${totalReviews.toLocaleString()} reviews` : ""}
                      </span>
                    </a>
                  ) : null}
                  {hotel.neighborhood || hotel.city ? (
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {[hotel.neighborhood, hotel.city].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <SaveHotelButton
                  tripContext={saveTripContext}
                  hotel={{
                    hotelId: hotel.id,
                    name: hotel.name,
                    city: hotel.city,
                    neighborhood: hotel.neighborhood,
                    photo: hotel.photos[0]?.url ?? "",
                    rating: score,
                    stars: hotel.stars,
                  }}
                />
                {fromPriceLabel ? (
                  <div className="hidden text-right md:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Rooms from</p>
                    <p className="mt-1 font-display text-2xl font-bold text-heading">{fromPriceLabel}</p>
                    <a href="#rooms" className="btn btn-primary mt-3 inline-flex">
                      Select a room
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <nav aria-label="Hotel sections" className="sticky top-0 z-20 -mx-5 flex gap-1 overflow-x-auto border-b border-line bg-bg/95 px-5 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0">
            <a href="#overview" className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-heading hover:bg-surface">Overview</a>
            {amenities.length > 0 ? <a href="#amenities" className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-heading hover:bg-surface">Amenities</a> : null}
            {locationHref || fullAddress ? <a href="#location" className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-heading hover:bg-surface">Location</a> : null}
            {reviews.categories.length > 0 ? <a href="#reviews" className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-heading hover:bg-surface">Reviews</a> : null}
            <a href="#rooms" className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-heading hover:bg-surface">Rooms</a>
          </nav>

          {hotelHighlights.length > 0 ? (
            <section className="border-b border-line py-8 sm:py-10">
              <p className="eyebrow">Why this stay stands out</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-heading sm:text-3xl">
                Highlights for your trip
              </h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {hotelHighlights.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-heading">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {amenities.length > 0 ? (
            <section id="amenities" className="scroll-mt-28 border-b border-line py-8 sm:py-10">
              <h2 className="font-display text-2xl font-bold text-heading sm:text-3xl">About this property</h2>
              <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                {amenities.map((facility) => (
                  <div key={facility} className="flex items-center gap-3 text-sm text-text">
                    <FacilityIcon label={facility} className="h-5 w-5 shrink-0 text-heading" />
                    <span>{facility}</span>
                  </div>
                ))}
              </div>
              {hotel.facilities.length > amenities.length ? (
                <details className="mt-6">
                  <summary className="cursor-pointer font-semibold text-link">
                    See all {hotel.facilities.length} amenities
                  </summary>
                  <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    {hotel.facilities.map((facility) => (
                      <div key={facility} className="flex items-center gap-3 text-sm text-text">
                        <FacilityIcon label={facility} className="h-4 w-4 shrink-0 text-muted" />
                        <span>{facility}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </section>
          ) : null}

          {(fullAddress || locationHref) ? (
            <section id="location" className="scroll-mt-28 border-b border-line py-8 sm:py-10">
              <h2 className="font-display text-2xl font-bold text-heading sm:text-3xl">Explore the area</h2>
              <div className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_.55fr]">
                <div className="min-h-72 overflow-hidden rounded-xl border border-line bg-surface">
                  {mapEmbed ? (
                    <iframe
                      title={`Map showing ${hotel.name}`}
                      src={mapEmbed}
                      className="h-80 w-full border-0 sm:h-96"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="grid h-80 place-items-center text-muted">Map unavailable</div>
                  )}
                </div>
                <div className="rounded-xl border border-line bg-white p-5 sm:p-6">
                  <MapPin className="h-6 w-6 text-heading" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-xl font-bold text-heading">Location</h3>
                  <p className="mt-2 font-semibold text-heading">{hotel.neighborhood || hotel.city || hotel.name}</p>
                  {fullAddress ? <p className="mt-2 text-sm leading-relaxed text-text">{fullAddress}</p> : null}
                  {locationHref ? (
                    <a
                      href={locationHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-1 font-semibold text-link"
                    >
                      Open in Google Maps <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {(hotel.description || hotel.checkIn || hotel.checkOut || hotel.importantInformation) ? (
            <section className="border-b border-line py-8 sm:py-10">
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="font-display text-2xl font-bold text-heading sm:text-3xl">About the hotel</h2>
                  {hotel.description ? (
                    <p className="mt-4 text-sm leading-7 text-text">{hotel.description}</p>
                  ) : null}
                </div>
                <div className="space-y-5">
                  {(hotel.checkIn || hotel.checkOut) ? (
                    <div className="rounded-xl border border-line bg-white p-5">
                      <div className="flex items-start gap-3">
                        <Clock3 className="mt-0.5 h-5 w-5 text-heading" aria-hidden="true" />
                        <div>
                          <h3 className="font-semibold text-heading">Check-in & check-out</h3>
                          <p className="mt-2 text-sm text-text">
                            {[hotel.checkIn ? `Check-in ${hotel.checkIn}` : "", hotel.checkOut ? `Check-out ${hotel.checkOut}` : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {hotel.importantInformation ? (
                    <div className="rounded-xl border border-line bg-white p-5">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-heading" aria-hidden="true" />
                        <div>
                          <h3 className="font-semibold text-heading">Important information</h3>
                          <p className="mt-2 text-sm leading-6 text-text">{hotel.importantInformation}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {(reviews.categories.length > 0 || reviews.reviews.length > 0) ? (
            <section id="reviews" className="scroll-mt-28 border-b border-line py-8 sm:py-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-heading sm:text-3xl">What guests mention</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                    Category scores summarize Nuitee guest feedback. Open the guest reviews below to read the original comments.
                  </p>
                </div>
                {reviews.average != null ? (
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Guest score</p>
                    <p className="mt-1 font-display text-3xl font-bold text-heading">{reviews.average.toFixed(1)}/10</p>
                  </div>
                ) : null}
              </div>

              {reviews.categories.length > 0 ? (
                <div className="mt-7 grid gap-x-8 gap-y-5 md:grid-cols-2">
                  {reviews.categories.slice(0, 8).map((category) => {
                    const rating = category.rating == null ? null : Math.max(0, Math.min(10, category.rating));
                    return (
                      <div key={category.name}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <h3 className="font-semibold text-heading">{category.name}</h3>
                          {rating != null ? <span className="font-bold text-heading">{rating.toFixed(1)}</span> : null}
                        </div>
                        {rating != null ? (
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-label={`${category.name} ${rating.toFixed(1)} out of 10`}>
                            <div className="h-full rounded-full bg-heading" style={{ width: `${rating * 10}%` }} />
                          </div>
                        ) : null}
                        {category.description ? (
                          <p className="mt-2 text-sm leading-6 text-muted">{category.description}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {reviews.reviews.length > 0 ? (
                <div className="mt-9">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="eyebrow">Verified guest feedback</p>
                      <h3 className="mt-1 font-display text-xl font-bold text-heading sm:text-2xl">Guest reviews</h3>
                    </div>
                    <span className="text-sm text-muted">{reviews.count.toLocaleString()} available</span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {reviews.reviews.slice(0, 4).map((review, index) => (
                      <article key={`${review.name}-${review.date}-${index}`} className="rounded-xl border border-line bg-white p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-heading">{review.name || "Guest"}</h4>
                            <p className="mt-1 text-xs text-muted">
                              {[review.travelerType, review.country, review.date].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          {review.score != null ? (
                            <span className="rounded-md bg-heading px-2 py-1 text-sm font-bold text-white">
                              {review.score.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                        {review.headline ? <p className="mt-4 font-semibold text-heading">{review.headline}</p> : null}
                        {review.pros ? <p className="mt-3 text-sm leading-6 text-text"><strong>Liked:</strong> {review.pros}</p> : null}
                        {review.cons ? <p className="mt-2 text-sm leading-6 text-text"><strong>Could improve:</strong> {review.cons}</p> : null}
                      </article>
                    ))}
                  </div>

                  {reviews.reviews.length > 4 ? (
                    <details className="mt-5">
                      <summary className="cursor-pointer font-semibold text-link">
                        Read more guest reviews
                      </summary>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        {reviews.reviews.slice(4).map((review, index) => (
                          <article key={`more-${review.name}-${review.date}-${index}`} className="rounded-xl border border-line bg-white p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-semibold text-heading">{review.name || "Guest"}</h4>
                                <p className="mt-1 text-xs text-muted">
                                  {[review.travelerType, review.country, review.date].filter(Boolean).join(" · ")}
                                </p>
                              </div>
                              {review.score != null ? (
                                <span className="rounded-md bg-heading px-2 py-1 text-sm font-bold text-white">
                                  {review.score.toFixed(1)}
                                </span>
                              ) : null}
                            </div>
                            {review.headline ? <p className="mt-4 font-semibold text-heading">{review.headline}</p> : null}
                            {review.pros ? <p className="mt-3 text-sm leading-6 text-text"><strong>Liked:</strong> {review.pros}</p> : null}
                            {review.cons ? <p className="mt-2 text-sm leading-6 text-text"><strong>Could improve:</strong> {review.cons}</p> : null}
                          </article>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section id="rooms" className="scroll-mt-24 py-8 sm:py-10">
            <div className="mb-6 sm:flex sm:items-end sm:justify-between sm:gap-6">
              <div>
                <p className="eyebrow">{hasStayDates ? "Available for your dates" : "Check availability"}</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-heading sm:text-3xl">
                  {hasStayDates ? "Choose your room" : "Add dates to see rooms"}
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted">
                {hasStayDates
                  ? "Live rates and cancellation terms are provided by Nuitee."
                  : "Choose check-in and check-out dates above to load live room rates."}
              </p>
            </div>
            {sandbox ? (
              <p className="mb-4 text-sm text-muted">
                Sandbox rate. Booking finishes on Alex Journeys through Nuitee and is not a live charge.
              </p>
            ) : null}
            {children}
          </section>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(var(--mobile-nav-bar)+env(safe-area-inset-bottom,0px))] z-[140] border-t border-line bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {fromPriceLabel ? (
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Rooms from</p>
              <p className="truncate font-display text-lg font-bold text-heading">{fromPriceLabel}</p>
            </div>
          ) : null}
          <a
            href={hasStayDates ? "#rooms" : "#hotel-search-editor"}
            className="btn btn-primary flex-1 justify-center text-center"
          >
            <BedDouble className="mr-2 h-4 w-4" aria-hidden="true" />
            {hasStayDates ? "Select a room" : "Add dates"}
          </a>
        </div>
      </div>
    </main>
  );
}
