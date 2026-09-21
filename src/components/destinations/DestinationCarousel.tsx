import type { DestinationCountry } from "@/data/destinations";
import { DestinationPhotoCard } from "@/components/destinations/DestinationPhotoCard";

type DestinationCarouselProps = {
  destinations: DestinationCountry[];
  /** Accessible name when the list is not labelled by a heading. */
  label?: string;
  labelledBy?: string;
  className?: string;
  /** Preload the first card (hub / homepage LCP). */
  preloadFirst?: boolean;
};

/**
 * Horizontal swipe/scroll row of portrait destination cards.
 * Left-aligned with page content; the next card peeks on the right.
 */
export function DestinationCarousel({
  destinations,
  label,
  labelledBy,
  className = "",
  preloadFirst = false,
}: DestinationCarouselProps) {
  if (destinations.length === 0) return null;

  return (
    <div className={`-mx-5 md:-mx-8 ${className}`.trim()}>
      <ul
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        className="flex gap-4 overflow-x-auto overscroll-x-contain scroll-px-5 scroll-smooth px-5 pb-6 pt-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] md:scroll-px-8 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {destinations.map((destination, index) => (
          <li
            key={destination.slug}
            className="w-[min(76vw,20.5rem)] shrink-0 snap-start"
          >
            <DestinationPhotoCard
              destination={destination}
              preload={preloadFirst && index === 0}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
