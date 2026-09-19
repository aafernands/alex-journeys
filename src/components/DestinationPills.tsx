import Image from "next/image";
import Link from "next/link";
import { Section, SectionHead } from "@/components/ui/Section";
import { destinationPills } from "@/data/content";

export function DestinationPills() {
  return (
    <Section
      id="where-next"
      tone="soft"
      hairline
      aria-labelledby="where-next-heading"
    >
      <SectionHead
        eyebrow="Destinations"
        title="Places from the journal."
        titleId="where-next-heading"
        description="Photo-led stops from trips already taken — tap a place to browse related stories."
        align="center"
      />

      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
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
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-cover"
                />
              </div>
              <span className="font-display px-3 py-3 text-center text-sm font-semibold tracking-tight text-heading">
                {pill.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
