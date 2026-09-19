import Link from "next/link";
import { about } from "@/data/content";

export function AuthorIntro() {
  return (
    <section
      id="author"
      className="border-b border-surface bg-surface-soft"
      aria-labelledby="author-heading"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:gap-10 md:px-8 md:py-14">
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-heading ring-2 ring-accent md:size-24 md:text-3xl"
          aria-hidden="true"
        >
          AF
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label text-muted">About the journal</p>
          <h2
            id="author-heading"
            className="font-display mt-2 text-2xl font-bold tracking-tight text-heading md:text-3xl"
          >
            {about.headline}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-text">
            {about.paragraphs[0]}
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
            <Link
              href="/about"
              className="text-link transition hover:text-accent"
            >
              About me →
            </Link>
            <Link
              href="/start-here"
              className="text-link transition hover:text-accent"
            >
              Start here →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
