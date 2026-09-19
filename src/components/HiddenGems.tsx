import Image from "next/image";
import Link from "next/link";
import { featuredBand } from "@/data/content";
import { formatPostDate, getFeaturedPosts } from "@/lib/posts";

export function HiddenGems() {
  const posts = getFeaturedPosts().slice(0, 6);

  return (
    <section
      id="hidden-gems"
      className="relative overflow-hidden"
      aria-labelledby="hidden-gems-heading"
    >
      {/* Photo banner */}
      <div className="relative min-h-[16rem] md:min-h-[20rem]">
        <Image
          src={featuredBand.image}
          alt={featuredBand.imageAlt}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div
          className="absolute inset-0 bg-near-black/45"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col items-center justify-center px-5 pb-28 pt-16 text-center md:pb-36 md:pt-20">
          <p className="font-sans text-xl font-semibold uppercase tracking-[0.2em] text-white/90 md:text-2xl">
            {featuredBand.eyebrow}
          </p>
          <h2
            id="hidden-gems-heading"
            className="font-display mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            {featuredBand.title}
          </h2>
        </div>
      </div>

      {/* Overlapping light gray tray */}
      <div className="relative z-20 -mt-20 px-4 pb-16 md:-mt-28 md:px-8 md:pb-24">
        <div className="mx-auto max-w-5xl rounded-2xl bg-surface px-4 py-6 shadow-[0_20px_50px_-28px_rgba(12,13,14,0.35)] sm:px-6 sm:py-8 md:rounded-3xl md:px-10 md:py-10">
          <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex gap-4 rounded-xl bg-white p-3 transition hover:shadow-md sm:p-4"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[10px] bg-surface-soft sm:h-28 sm:w-28">
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage.url}
                        alt={post.featuredImage.alt || post.title}
                        fill
                        sizes="112px"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
                    <h3 className="font-display text-base font-semibold leading-snug text-text transition group-hover:text-accent sm:text-xl sm:leading-tight">
                      {post.title}
                    </h3>
                    <time
                      className="mt-2 text-sm text-muted"
                      dateTime={post.date}
                    >
                      {formatPostDate(post.date)}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-center md:mt-8">
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-md border border-heading/15 bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-heading transition hover:border-accent hover:text-accent"
            >
              View all stories
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
