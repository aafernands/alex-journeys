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
  sizes = "(max-width: 640px) 76vw, 328px",
  preload = false,
}: DestinationPhotoCardProps) {
  const city = destinationCity(destination);
  const href = publicDestinationPath(destination.slug);

  return (
    <Link
      href={href}
      aria-label={`${destination.name}, ${city}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-[1.75rem] shadow-[0_18px_40px_-18px_rgba(20,17,13,0.55)] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <Image
        src={destination.image}
        alt={destination.imageAlt}
        fill
        preload={preload}
        sizes={sizes}
        className="object-cover transition duration-500 group-hover:scale-[1.04]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-near-black/85 via-near-black/30 to-transparent"
      />
      <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start px-5 pb-5 pt-16">
        <span className="font-sans text-[0.9375rem] font-medium leading-snug text-hero-type [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
          {destination.name}
        </span>
        <span className="mt-0.5 inline-flex items-center gap-1.5 text-hero-type">
          <NavIcon
            name="map-pin"
            size={18}
            className="shrink-0 fill-current text-hero-type"
          />
          <span className="font-sans text-xl font-bold tracking-tight text-hero-type [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] md:text-[1.35rem]">
            {city}
          </span>
        </span>
      </span>
    </Link>
  );
}
