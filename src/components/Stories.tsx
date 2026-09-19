import Image from "next/image";
import { stories } from "@/data/content";

export function Stories() {
  return (
    <section
      id="stories"
      className="border-b border-sand/50 bg-cream-deep/40"
      aria-labelledby="stories-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="mb-10 flex flex-col gap-3 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage">
              Featured stories
            </p>
            <h2
              id="stories-heading"
              className="font-display mt-2 text-3xl tracking-tight text-ink sm:text-4xl md:text-5xl"
            >
              Recent trips
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted md:text-right">
            <span className="sample-badge mb-2 inline-flex">Sample cards</span>
            <br className="hidden md:block" />
            Destinations, blurbs, and dates are placeholders — swap for your own
            dispatches.
          </p>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {stories.map((story, index) => (
            <li key={story.id}>
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sand/70 bg-surface shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(28,25,23,0.4)]">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={story.image}
                    alt={story.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    priority={index < 2}
                  />
                </div>
                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-terracotta">
                      {story.destination}
                    </p>
                    <time className="text-xs text-muted" dateTime={story.date}>
                      {story.date}
                    </time>
                  </div>
                  <h3 className="font-display mt-2 text-2xl leading-snug text-ink md:text-[1.65rem]">
                    {story.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                    {story.blurb}
                  </p>
                  <a
                    href="/destinations"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-terracotta"
                  >
                    More destinations
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
