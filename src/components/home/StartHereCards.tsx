import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { startHereCards } from "@/data/content";

export function StartHereCards() {
  return (
    <section
      id="start-here-cards"
      className="bg-white"
      aria-labelledby="start-here-cards-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-label text-muted">New here?</p>
          <h2
            id="start-here-cards-heading"
            className="font-display mt-2 text-display uppercase tracking-tight text-heading"
          >
            Start here
          </h2>
          <p className="mt-3 text-base leading-relaxed text-text">
            Three easy ways into the journal — places I&apos;ve been, stories from
            the road, and practical notes I still use.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-3 sm:gap-6">
          {startHereCards.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="group flex h-full flex-col rounded-2xl border border-surface bg-white p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_16px_40px_-24px_rgba(12,13,14,0.3)]"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-surface-soft text-accent transition group-hover:bg-accent group-hover:text-white">
                  <NavIcon name={card.icon} size={22} />
                </span>
                <span className="font-display mt-5 text-xl font-bold text-heading transition group-hover:text-accent">
                  {card.title}
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-text">
                  {card.description}
                </span>
                <span className="mt-4 text-sm font-bold text-link transition group-hover:text-accent">
                  {card.cta} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
