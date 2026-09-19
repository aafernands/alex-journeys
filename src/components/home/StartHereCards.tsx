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
        <div className="section-head centered mx-auto">
          <p className="eyebrow">New here?</p>
          <h2
            id="start-here-cards-heading"
            className="font-display mt-2 text-display text-heading"
          >
            Start here.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-text">
            Three easy ways into the journal — places I&apos;ve been, stories from
            the road, and practical notes I still use.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {startHereCards.map((card, i) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="panel-interactive group flex h-full flex-col p-5 md:p-6"
              >
                <div className="panel-nested flex items-center justify-between gap-3 p-3">
                  <span className="flex size-10 items-center justify-center rounded-md bg-white text-accent">
                    <NavIcon name={card.icon} size={20} />
                  </span>
                  <span className="font-display text-xs font-bold tracking-[0.14em] text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <span className="font-display mt-4 text-lg font-bold text-heading">
                  {card.title}
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-text">
                  {card.description}
                </span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-link transition group-hover:text-accent">
                  {card.cta}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
