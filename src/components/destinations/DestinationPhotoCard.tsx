import Image from "next/image";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import {
  destinationCity,
  type DestinationCountry,
} from "@/data/destinations";
import { publicDestinationPath } from "@/lib/public-paths";

type DestinationPhotoCardProps = {
  destination: DestinationCountry;
  sizes?: string;
  /** Preload the image when this card is the likely LCP element. */
  preload?: boolean;
};

/**
 * Portrait travel card: full-bleed photo, rounded corners, country + pin/city overlay.
 */
export function DestinationPhotoCard({
  destination,
  sizes = "(max-width: 640px) 82vw, 328px",
  preload = false,
}: DestinationPhotoCardProps) {
  const city = destinationCity(destination);
  const href = publicDestinationPath(destination.slug);

  return (
    <Link
      href={href}
      aria-label={`${destination.name}, ${city}`}
      className="destination-photo-card group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <Image
        src={destination.image}
        alt={destination.imageAlt}
        fill
        preload={preload}
        sizes={sizes}
        className="object-cover transition duration-500 group-hover:scale-[1.04]"
      />
      <span aria-hidden="true" className="destination-photo-scrim" />
      <span className="destination-photo-overlay">
        <span className="overlay-kicker">{destination.name}</span>
        <span className="mt-1 inline-flex items-center gap-1.5 text-hero-type">
          <NavIcon
            name="map-pin"
            size={18}
            className="shrink-0 fill-current text-hero-type"
          />
          <span className="overlay-title">{city}</span>
        </span>
      </span>
    </Link>
  );
}
