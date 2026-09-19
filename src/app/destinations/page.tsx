import type { Metadata } from "next";
import Link from "next/link";
import { destinationsTree } from "@/data/destinations";

export const metadata: Metadata = {
  title: "Places",
  description:
    "Places I’ve been — destinations from past trips on Fernandes Journeys.",
};

export default function DestinationsIndexPage() {
  return (
    <main className="bg-white">
      <div className="section-shell py-10 md:py-14">
        <p className="eyebrow">Places</p>
        <h1 className="font-display mt-2 text-display text-heading">
          Places I&apos;ve been.
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
              className="panel p-5 md:p-6"
            >
              <h2
                id={`continent-${continent.id}`}
                className="font-display text-title text-heading"
              >
                {continent.name}
              </h2>

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
      className="panel-nested group flex h-full flex-col bg-white p-4 transition hover:bg-surface-soft"
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-accent">
        {subtitle}
      </p>
      <p className="font-display mt-2 text-xl font-semibold text-heading md:text-2xl">
        {title}
      </p>
      <p className="mt-3 text-sm font-semibold text-link transition group-hover:text-accent">
        From my trip →
      </p>
    </Link>
  );
}
