import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { Section, SectionHead } from "@/components/ui/Section";
import { startHereCards } from "@/data/content";

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
        {startHereCards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="panel-interactive group flex h-full flex-col p-6"
            >
              <span className="flex items-center gap-3">
                <NavIcon
                  name={card.icon}
                  size={22}
                  className="shrink-0 text-accent"
                />
                <span className="font-display text-lg font-bold tracking-tight text-heading md:text-xl">
                  {card.title}
                </span>
              </span>
              <span className="mt-3 flex-1 text-sm leading-relaxed text-text md:text-[0.9375rem]">
                {card.description}
              </span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-link transition group-hover:gap-2.5 group-hover:text-accent">
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
