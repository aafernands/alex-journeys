import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
      <div className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4 md:gap-1.5 md:p-1.5">
          {featured.map((dest, i) => (
            <Link
              key={dest.slug}
              href={`/destinations/${dest.slug}`}
              className={`group relative block overflow-hidden bg-surface ${
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
              <span className="absolute inset-0 bg-gradient-to-t from-heading/70 via-heading/10 to-transparent" />
              <span className="absolute bottom-3 left-3 right-3 md:bottom-4 md:left-4">
                <span className="font-display text-lg font-bold text-white drop-shadow md:text-xl">
                  {dest.name}
                </span>
                <span className="mt-0.5 block text-xs font-medium text-white/80">
                  {dest.region}
                </span>
              </span>
            </Link>
          ))}
        </div>

        {/* Soft watermark */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 top-3 select-none font-display text-[clamp(3.5rem,12vw,7rem)] font-bold leading-none tracking-tight text-heading/[0.06] md:top-6 md:right-4"
        >
          Places
        </p>
      </div>

      {/* Jump links */}
      <nav
        aria-label="Continents"
        className="mt-8 flex flex-wrap gap-2"
      >
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

      {/* Continent sections */}
      <div className="mt-14 space-y-16">
        {destinationsTree.map((continent) => (
          <section
            key={continent.id}
            id={continent.id}
            aria-labelledby={`continent-${continent.id}`}
            className="scroll-mt-28"
          >
            <div className="relative mb-6 flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="eyebrow">{continent.countries.length}{" "}
                  {continent.countries.length === 1 ? "place" : "places"}
                </p>
                <h2
                  id={`continent-${continent.id}`}
                  className="font-display mt-1 text-title text-heading"
                >
                  {continent.name}
                </h2>
              </div>
              <span
                aria-hidden="true"
                className="hidden select-none font-display text-5xl font-bold leading-none text-heading/[0.07] sm:block"
              >
                {continent.name.slice(0, 2)}
              </span>
            </div>

            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {continent.countries.map((country) => (
                <li key={country.slug}>
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

function DestinationCard({ country }: { country: DestinationCountry }) {
  return (
    <Link
      href={`/destinations/${country.slug}`}
      className="panel-interactive group flex h-full flex-col overflow-hidden"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface sm:aspect-[5/4]">
        <Image
          src={country.image}
          alt={country.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-heading/55 via-transparent to-transparent opacity-80" />
        <span className="absolute left-3 top-3 rounded-full border border-white/25 bg-heading/35 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
          {country.region}
        </span>
        <span className="absolute bottom-3 left-3 right-3">
          <span className="font-display block text-2xl font-bold text-white drop-shadow">
            {country.name}
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <p className="flex-1 text-sm leading-relaxed text-text">
          {country.blurb}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link transition group-hover:gap-2.5 group-hover:text-accent">
          Open place
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
