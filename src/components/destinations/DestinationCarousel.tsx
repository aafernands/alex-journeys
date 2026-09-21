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
    <div className={`destination-carousel ${className}`.trim()}>
      <ul
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        className="destination-carousel-track"
      >
        {destinations.map((destination, index) => (
          <li key={destination.slug} className="destination-carousel-item">
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
