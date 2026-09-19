import type { Metadata } from "next";
import Link from "next/link";
import { destinationsTree } from "@/data/destinations";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Places I’ve been — destinations from past trips on Fernandes Journeys.",
};

export default function DestinationsIndexPage() {
  return (
    <main className="border-b border-sand/50 bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <p className="sample-badge">Trip journal</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sage">
          Destinations
        </p>
        <h1 className="font-display mt-2 text-4xl tracking-tight text-ink sm:text-5xl md:text-6xl">
          Places I’ve been
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          A map of past trips — not a catalog to book from. Each page is a
          placeholder for notes and photos from journeys I’ve already taken.
        </p>

        <div className="mt-12 space-y-12">
          {destinationsTree.map((continent) => (
            <section
              key={continent.id}
              aria-labelledby={`continent-${continent.id}`}
            >
              <h2
                id={`continent-${continent.id}`}
                className="font-display text-2xl text-ink md:text-3xl"
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
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {region.name}
                  </h3>
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
      className="group flex h-full flex-col rounded-2xl border border-sand/70 bg-surface p-5 shadow-[0_10px_40px_-28px_rgba(28,25,23,0.35)] transition hover:-translate-y-0.5 hover:border-terracotta/40 hover:shadow-[0_16px_40px_-24px_rgba(28,25,23,0.4)]"
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-terracotta">
        {subtitle}
      </p>
      <p className="font-display mt-2 text-2xl text-ink group-hover:text-terracotta">
        {title}
      </p>
      <p className="mt-3 text-sm text-muted">From my trip · sample page →</p>
    </Link>
  );
}
