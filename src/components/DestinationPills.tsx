import Image from "next/image";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { Section, SectionHead } from "@/components/ui/Section";
import {
  destinationCity,
  getAllDestinations,
} from "@/data/destinations";
import { publicDestinationPath } from "@/lib/public-paths";
import { getSiteDesign } from "@/lib/site-design";

export function DestinationPills() {
  const { places } = getSiteDesign().homeSections;
  const destinations = getAllDestinations();

  return (
    <Section
      id="where-next"
      tone="soft"
      hairline
      aria-labelledby="where-next-heading"
    >
      <SectionHead
        eyebrow={places.eyebrow}
        title={places.title}
        titleId="where-next-heading"
        description={places.description}
        align="center"
      />

      <ul className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 lg:gap-5 [&::-webkit-scrollbar]:hidden">
        {destinations.map((dest) => {
          const city = destinationCity(dest);
          const href = publicDestinationPath(dest.slug);

          return (
            <li
              key={dest.slug}
              className="w-[min(78vw,20rem)] shrink-0 snap-start sm:w-auto"
            >
              <Link
                href={href}
                aria-label={`${dest.name}, ${city}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-[1.75rem] shadow-[0_18px_40px_-20px_rgba(20,17,13,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <Image
                  src={dest.image}
                  alt={dest.imageAlt}
                  fill
                  sizes="(max-width: 640px) 78vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-near-black/70 via-near-black/20 to-transparent"
                />
                <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start px-5 pb-5 pt-16">
                  <span className="font-sans text-sm font-normal text-hero-type/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
                    {dest.name}
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
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
