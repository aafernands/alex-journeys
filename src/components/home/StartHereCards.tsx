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
      hairline
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

      <ul className="hub-follow grid gap-3 sm:grid-cols-3 sm:gap-4">
        {startHere.cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="panel-interactive group flex h-full flex-col p-4"
            >
              <span className="flex items-center gap-3">
                <NavIcon
                  name={card.icon}
                  size={22}
                  className="shrink-0 text-accent"
                />
                <span className="card-title">{card.title}</span>
              </span>
              <span className="card-body mt-3 flex-1">
                {card.description}
              </span>
              <span className="card-cta mt-4 inline-flex items-center gap-1.5 transition group-hover:gap-2.5 group-hover:text-accent">
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
