import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import {
  destinationsTree,
  getAllDestinations,
  type DestinationCountry,
} from "@/data/destinations";

export const metadata: Metadata = {
  title: "Places",
  description:
    "Places I’ve been — photo-led destinations from past trips on Fernandes Journeys.",
};

export default function DestinationsIndexPage() {
  const all = getAllDestinations();
  const featured = all.slice(0, 4);

  return (
    <SitePage
      label="Places"
      title="Places I’ve been."
      description="A photo map of past trips — Iceland nights, Canadian weekends, mountain mornings, Caribbean water, and Rio after dark. Stories and notes, not a booking catalog."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Places" },
      ]}
    >
      {/* Hero mosaic */}
      <div className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="grid grid-cols-2 gap-1.5 p-1.5 md:grid-cols-4">
          {featured.map((dest, i) => (
            <Link
              key={dest.slug}
              href={`/destinations/${dest.slug}`}
              className={`group relative block overflow-hidden rounded-xl bg-surface ${
                i === 0
                  ? "col-span-2 aspect-[16/10] md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[22rem]"
                  : "aspect-[4/3] md:aspect-auto md:min-h-[10.75rem]"
              }`}
            >
              <Image
                src={dest.image}
                alt={dest.imageAlt}
                fill
                priority={i === 0}
                sizes={
                  i === 0
                    ? "(max-width: 768px) 100vw, 50vw"
                    : "(max-width: 768px) 50vw, 25vw"
                }
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <PlaceLabel name={dest.name} size={i === 0 ? "lg" : "md"} />
            </Link>
          ))}
        </div>
      </div>

      <nav aria-label="Continents" className="mt-8 flex flex-wrap gap-2">
        {destinationsTree.map((continent) => (
          <a
            key={continent.id}
            href={`#${continent.id}`}
            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-semibold text-heading transition hover:border-border-strong hover:bg-surface-soft"
          >
            {continent.name}
            <span className="ml-1.5 text-muted">
              {continent.countries.length}
            </span>
          </a>
        ))}
      </nav>

      <div className="mt-14 space-y-16">
        {destinationsTree.map((continent) => (
          <section
            key={continent.id}
            id={continent.id}
            aria-labelledby={`continent-${continent.id}`}
            className="scroll-mt-28"
          >
            <h2
              id={`continent-${continent.id}`}
              className="font-display text-center text-3xl font-semibold tracking-tight text-heading md:text-4xl"
            >
              {continent.name}
            </h2>

            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:max-w-4xl lg:mx-auto">
              {continent.countries.map((country) => (
                <li
                  key={country.slug}
                  className={
                    continent.countries.length === 1
                      ? "sm:col-span-2 lg:mx-auto lg:w-full lg:max-w-xl"
                      : ""
                  }
                >
                  <DestinationCard country={country} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SitePage>
  );
}

function PlaceLabel({
  name,
  size = "lg",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  const icon = size === "lg" ? 22 : 18;
  const text =
    size === "lg"
      ? "text-[1.35rem] md:text-[1.6rem]"
      : "text-base md:text-lg";

  return (
    <span className="absolute bottom-4 left-4 right-4 md:bottom-5 md:left-5">
      <span className="inline-flex items-center gap-2 text-white">
        <NavIcon
          name="map-pin"
          size={icon}
          className="shrink-0 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
        />
        <span
          className={`font-sans font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] ${text}`}
        >
          {name}
        </span>
      </span>
    </span>
  );
}

function DestinationCard({ country }: { country: DestinationCountry }) {
  return (
    <Link
      href={`/destinations/${country.slug}`}
      className="group relative block aspect-[16/10] overflow-hidden rounded-2xl bg-surface shadow-[0_10px_30px_-18px_rgba(31,26,20,0.45)] ring-1 ring-black/5 transition hover:shadow-[0_16px_36px_-16px_rgba(31,26,20,0.5)]"
      aria-label={`${country.name} — ${country.blurb}`}
    >
      <Image
        src={country.image}
        alt={country.imageAlt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 28rem"
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
      <PlaceLabel name={country.name} size="lg" />
    </Link>
  );
}
