import Image from "next/image";
import Link from "next/link";
import { getFeaturedPosts, formatPostDateShort } from "@/lib/posts";

/** Destination label for homepage cards when a post is mapped. */
const DESTINATION_LABELS: Record<string, string> = {
  mexico: "Cancún, Mexico",
  iceland: "Iceland",
  brazil: "Rio de Janeiro, Brazil",
  canada: "Toronto, Canada",
  "united-states": "United States",
};

export function Stories() {
  const stories = getFeaturedPosts();

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
              From the journal
            </p>
            <h2
              id="stories-heading"
              className="font-display mt-2 text-3xl tracking-tight text-ink sm:text-4xl md:text-5xl"
            >
              Recent trips
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted md:text-right">
            Real stories from past journeys.{" "}
            <Link
              href="/blog"
              className="font-semibold text-ink transition hover:text-terracotta"
            >
              Browse the full blog →
            </Link>
          </p>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:gap-8">
          {stories.map((story, index) => {
            const destSlug = story.destinations[0];
            const destLabel = destSlug
              ? DESTINATION_LABELS[destSlug] || destSlug
              : "Travel";
            return (
              <li key={story.slug}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sand/70 bg-surface shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(28,25,23,0.4)]">
                  <Link
                    href={`/blog/${story.slug}`}
                    className="flex h-full flex-col"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-cream-deep">
                      {story.featuredImage ? (
                        <Image
                          src={story.featuredImage.url}
                          alt={story.featuredImage.alt || story.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                          priority={index < 2}
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-5 md:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-terracotta">
                          {destLabel}
                        </p>
                        <time
                          className="text-xs text-muted"
                          dateTime={story.date}
                        >
                          {formatPostDateShort(story.date)}
                        </time>
                      </div>
                      <h3 className="font-display mt-2 text-2xl leading-snug text-ink transition group-hover:text-terracotta md:text-[1.65rem]">
                        {story.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft line-clamp-3">
                        {story.excerpt}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink transition group-hover:text-terracotta">
                        Read story
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
