import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { Section, SectionHead } from "@/components/ui/Section";
import { guideHubs } from "@/data/guides";

export function GuidesHubStrip() {
  return (
    <Section
      id="guides-hubs"
      tone="white"
      aria-labelledby="guides-hubs-heading"
    >
      <SectionHead
        eyebrow="Guides"
        title="Guides worth opening."
        titleId="guides-hubs-heading"
        description="Six hubs of notes I still use — planning, money, packing, smarter travel, stays, and experiences."
        action={
          <Link href="/guides" className="btn btn-secondary rounded-sm">
            All guides
            <span aria-hidden="true">→</span>
          </Link>
        }
      />

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guideHubs.map((hub) => (
          <li key={hub.slug}>
            <Link
              href={`/guides/${hub.slug}`}
              className="panel-interactive group flex h-full gap-3 border-dashed p-4 md:p-5"
            >
              <span className="panel-nested flex size-10 shrink-0 items-center justify-center bg-white text-accent">
                <NavIcon name={hub.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="font-display block text-base font-semibold text-heading">
                  {hub.title}
                </span>
                <span className="mt-1 block text-sm leading-snug text-text line-clamp-2">
                  {hub.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
