import Link from "next/link";
import { AdminSectionEdit } from "@/components/admin/AdminPublicChrome";
import { NavIcon } from "@/components/icons/NavIcon";
import { Section, SectionHead } from "@/components/ui/Section";
import { CMS_DESIGN_HREF } from "@/lib/admin-edit";
import { getSiteDesign } from "@/lib/site-design";

export function StartHereCards() {
  const { startHere } = getSiteDesign().homeSections;

  return (
    <Section
      id="start-here-cards"
      tone="white"
      aria-labelledby="start-here-cards-heading"
    >
      <div className="relative">
        <div className="absolute right-0 top-0 z-[1]">
          <AdminSectionEdit
            href={`${CMS_DESIGN_HREF}#design-startHere`}
            label="Edit section"
          />
        </div>
      <SectionHead
        eyebrow={startHere.eyebrow}
        title={startHere.title}
        titleId="start-here-cards-heading"
        description={startHere.description}
        align="center"
      />
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {startHere.cards.map((card) => (
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
