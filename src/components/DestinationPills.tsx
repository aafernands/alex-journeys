import Image from "next/image";
import Link from "next/link";
import { destinationPills } from "@/data/content";

export function DestinationPills() {
  return (
    <section
      id="where-next"
      className="border-y border-border bg-surface-soft"
      aria-labelledby="where-next-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        <div className="section-head centered mx-auto">
          <p className="eyebrow">Destinations</p>
          <h2
            id="where-next-heading"
            className="font-display mt-2 text-display text-heading"
          >
            Places from the journal.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-text">
            Photo-led stops from trips already taken — tap a place to browse
            related stories.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
          {destinationPills.map((pill) => (
            <li key={pill.name}>
              <Link
                href={pill.href}
                className="panel-interactive group flex h-full flex-col overflow-hidden"
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-surface">
                  <Image
                    src={pill.image}
                    alt={pill.imageAlt}
                    fill
                    sizes="(max-width: 640px) 50vw, 160px"
                    className="object-cover"
                  />
                </div>
                <span className="font-display px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-heading sm:text-sm">
                  {pill.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
