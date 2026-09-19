import Image from "next/image";
import Link from "next/link";
import { featuredBand } from "@/data/content";
import { formatPostDate, getFeaturedPosts } from "@/lib/posts";

export function HiddenGems() {
  const posts = getFeaturedPosts().slice(0, 6);

  return (
    <section
      id="hidden-gems"
      className="bg-white"
      aria-labelledby="hidden-gems-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="relative min-h-[12rem] md:min-h-[14rem]">
            <Image
              src={featuredBand.image}
              alt={featuredBand.imageAlt}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div
              className="absolute inset-0 bg-heading/55"
              aria-hidden="true"
            />
            <div className="relative z-10 flex flex-col items-start justify-end px-6 py-8 md:px-8 md:py-10">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-accent">
                {featuredBand.eyebrow}
              </p>
              <h2
                id="hidden-gems-heading"
                className="font-display mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
              >
                {featuredBand.title}
              </h2>
            </div>
          </div>

          <div className="bg-surface-soft p-4 sm:p-5 md:p-6">
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="panel-interactive group flex gap-3 p-3 sm:gap-4 sm:p-4"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-white sm:h-24 sm:w-24">
                      {post.featuredImage ? (
                        <Image
                          src={post.featuredImage.url}
                          alt={post.featuredImage.alt || post.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
                      <h3 className="font-display text-base font-semibold leading-snug text-heading sm:text-lg">
                        {post.title}
                      </h3>
                      <time
                        className="mt-1.5 text-sm text-muted"
                        dateTime={post.date}
                      >
                        {formatPostDate(post.date)}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex justify-center md:mt-6">
              <Link href="/blog" className="btn btn-secondary btn-block sm:w-auto">
                View all stories
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
