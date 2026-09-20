import Link from "next/link";
import type { DestinationItinerary as ItineraryData } from "@/data/destinations";

type Props = {
  itinerary?: ItineraryData;
  featuredPostSlug?: string;
};

export function DestinationItinerary({
  itinerary,
  featuredPostSlug,
}: Props) {
  const days = itinerary?.days?.filter(
    (d) => d.day.trim() && d.title.trim() && d.detail.trim(),
  );
  if (!days?.length) return null;

  const heading =
    itinerary?.title?.trim() || "Suggested itinerary";

  return (
    <section
      className="mt-10"
      aria-labelledby="destination-itinerary-heading"
    >
      <div className="panel-soft p-5 shadow-sm sm:p-6">
        <p className="eyebrow">From the trip</p>
        <h2
          id="destination-itinerary-heading"
          className="font-display mt-1 text-lg font-semibold text-heading sm:text-xl"
        >
          {heading}
        </h2>

        <ol className="mt-5 space-y-3">
          {days.map((item, idx) => (
            <li
              key={`${item.day}-${item.title}-${idx}`}
              className="panel-nested flex gap-3 bg-white p-3.5 sm:gap-4 sm:p-4 dark:bg-[var(--white)]"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-accent/10 text-[0.65rem] font-bold uppercase tracking-wide text-accent-deep dark:text-accent"
                aria-hidden="true"
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  {item.day}
                </p>
                <p className="mt-0.5 font-display text-base font-semibold leading-snug text-heading sm:text-lg">
                  {item.title}
                </p>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-text sm:text-base">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {featuredPostSlug ? (
          <p className="mt-5">
            <Link
              href={`/blog/${featuredPostSlug}`}
              className="text-sm font-semibold text-link transition hover:text-accent"
            >
              Read the full trip journal →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
