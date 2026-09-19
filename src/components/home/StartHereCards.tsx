import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { Section, SectionHead } from "@/components/ui/Section";
import { startHereCards } from "@/data/content";

const badgeTints = [
  "bg-orange-50 text-accent border-orange-100",
  "bg-sky-50 text-steel border-sky-100",
  "bg-amber-50 text-amber-700 border-amber-100",
];

export function StartHereCards() {
  return (
    <Section
      id="start-here-cards"
      tone="white"
      aria-labelledby="start-here-cards-heading"
    >
      <SectionHead
        eyebrow="New here?"
        title="Start here."
        titleId="start-here-cards-heading"
        description="Three easy ways into the journal — places I've been, stories from the road, and practical notes I still use."
        align="center"
      />

      <ul className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {startHereCards.map((card, i) => (
          <li key={card.href} className="relative">
            {i === 0 ? (
              <span
                className="journal-tape absolute -top-2 left-5 z-10 rotate-[-4deg] px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-heading"
                aria-hidden="true"
              >
                First page
              </span>
            ) : null}
            <Link
              href={card.href}
              className="panel-interactive group flex h-full flex-col border-dashed p-5 md:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`flex size-10 items-center justify-center rounded-sm border ${badgeTints[i % badgeTints.length]}`}
                >
                  <NavIcon name={card.icon} size={20} />
                </span>
                <span className="font-display text-xs font-bold tracking-[0.12em] text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <span className="font-display mt-5 text-lg font-semibold text-heading">
                {card.title}
              </span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-text">
                {card.description}
              </span>
              <span className="btn btn-secondary btn-block mt-5 !min-h-10 rounded-sm text-sm group-hover:bg-white">
                {card.cta}
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
