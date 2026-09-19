import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { about, site } from "@/data/content";

export function AuthorIntro() {
  return (
    <Section
      id="author"
      tone="soft"
      hairline
      size="md"
      aria-labelledby="author-heading"
    >
      <div className="panel flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-soft md:size-20">
          <Image
            src={site.authorPhoto}
            alt={site.authorName}
            fill
            sizes="80px"
            className="object-cover object-top"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">About the journal</p>
          <h2
            id="author-heading"
            className="font-display mt-2 text-2xl font-bold tracking-tight text-heading md:text-[1.75rem]"
          >
            {about.headline}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-text">
            {about.paragraphs[0]}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/about" className="btn btn-ink btn-block sm:w-auto">
              About me
            </Link>
            <Link
              href="/start-here"
              className="btn btn-secondary btn-block sm:w-auto"
            >
              Start here
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
