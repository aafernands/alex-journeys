import Image from "next/image";
import Link from "next/link";
import { destinationPills } from "@/data/content";

export function DestinationPills() {
  return (
    <section
      id="where-next"
      className="bg-white"
      aria-labelledby="where-next-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <h2
          id="where-next-heading"
          className="font-display text-center text-display uppercase tracking-tight text-heading"
        >
          Where you&apos;re going next?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted md:text-base">
          Photo-led stops from trips already in the journal — tap a place to
          browse related stories.
        </p>

        <ul className="mt-10 flex flex-wrap items-start justify-center gap-5 sm:gap-6 md:gap-8">
          {destinationPills.map((pill) => (
            <li key={pill.name}>
              <Link
                href={pill.href}
                className="group flex w-[5.5rem] flex-col items-center gap-2.5 sm:w-24 md:w-28"
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-full ring-2 ring-surface transition group-hover:ring-accent group-hover:shadow-lg">
                  <Image
                    src={pill.image}
                    alt={pill.imageAlt}
                    fill
                    sizes="112px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="font-display text-xs font-bold uppercase tracking-wide text-heading transition group-hover:text-accent sm:text-sm">
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
