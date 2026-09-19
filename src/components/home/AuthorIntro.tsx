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
      <div className="panel relative flex flex-col gap-6 overflow-hidden p-6 md:flex-row md:items-center md:gap-8 md:p-8">
        <span
          className="journal-tape absolute right-6 top-4 hidden rotate-2 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-heading sm:inline"
          aria-hidden="true"
        >
          Author note
        </span>
        <div className="relative size-16 shrink-0 overflow-hidden rounded-sm border border-border bg-surface-soft shadow-[0_8px_20px_-14px_rgba(31,26,20,0.45)] md:size-20">
          <Image
            src={site.authorPhoto}
            alt={site.authorName}
            fill
            sizes="80px"
            className="object-cover object-top"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="journal-entry-label">
            <span aria-hidden="true">✦</span>
            About the journal
          </p>
          <h2
            id="author-heading"
            className="font-display mt-4 text-2xl font-semibold tracking-tight text-heading md:text-[1.75rem]"
          >
            {about.headline}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-text">
            {about.paragraphs[0]}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/about" className="btn btn-ink btn-block rounded-sm sm:w-auto">
              About me
            </Link>
            <Link
              href="/start-here"
              className="btn btn-secondary btn-block rounded-sm sm:w-auto"
            >
              Start here
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
