import type { Metadata } from "next";
import Link from "next/link";
import { destinationsTree } from "@/data/destinations";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Places I’ve been — destinations from past trips on Alex Journly.",
};

export default function DestinationsIndexPage() {
  return (
    <main className="bg-white pt-28 md:pt-32">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <p className="text-label text-muted">Destinations</p>
        <h1 className="font-display mt-2 text-display uppercase tracking-tight text-heading">
          Places I&apos;ve been
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-text">
          Whether you&apos;re dreaming of icy adventures in Iceland, beach
          escapes in Mexico, or vibrant cities across Europe and South America —
          you&apos;re in the right place. This is a map of past trips and
          personal stories, not a catalog to book from.
        </p>

        <div className="mt-12 space-y-12">
          {destinationsTree.map((continent) => (
            <section
              key={continent.id}
              aria-labelledby={`continent-${continent.id}`}
            >
              <h2
                id={`continent-${continent.id}`}
                className="font-display text-title text-heading"
              >
                {continent.name}
              </h2>

              {continent.countries && (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {continent.countries.map((country) => (
                    <li key={country.slug}>
                      <DestinationCard
                        href={`/destinations/${country.slug}`}
                        title={country.name}
                        subtitle={country.region}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {continent.regions?.map((region) => (
                <div key={region.id} className="mt-8">
                  <h3 className="text-label text-muted">{region.name}</h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {region.countries.map((country) => (
                      <li key={country.slug}>
                        <DestinationCard
                          href={`/destinations/${country.slug}`}
                          title={country.name}
                          subtitle={region.name}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function DestinationCard({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-surface bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-accent">
        {subtitle}
      </p>
      <p className="font-display mt-2 text-2xl font-semibold text-heading group-hover:text-accent">
        {title}
      </p>
      <p className="mt-3 text-sm text-muted">From my trip →</p>
    </Link>
  );
}
