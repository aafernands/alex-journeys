import Image from "next/image";
import Link from "next/link";
import { Section, SectionHead } from "@/components/ui/Section";
import { featuredBand } from "@/data/content";
import { formatPostDate, getFeaturedPosts } from "@/lib/posts";

export function HiddenGems() {
  const posts = getFeaturedPosts().slice(0, 6);

  return (
    <Section
      id="hidden-gems"
      tone="white"
      aria-labelledby="hidden-gems-heading"
    >
      <SectionHead
        eyebrow={featuredBand.eyebrow}
        title={`${featuredBand.title}.`}
        titleId="hidden-gems-heading"
        description="Featured stories worth a slower read — the stops and details I still talk about."
        action={
          <Link href="/blog" className="btn btn-secondary rounded-sm">
            View all stories
            <span aria-hidden="true">→</span>
          </Link>
        }
      />

      <div className="panel relative mt-10 overflow-hidden">
        <span
          className="journal-tape absolute right-8 top-3 z-20 rotate-2 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-heading"
          aria-hidden="true"
        >
          Keepers
        </span>
        <div className="relative min-h-[11rem] md:min-h-[13rem]">
          <Image
            src={featuredBand.image}
            alt={featuredBand.imageAlt}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            priority
          />
          <div
            className="absolute inset-0 bg-heading/50"
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full min-h-[11rem] flex-col items-start justify-end px-6 py-7 md:min-h-[13rem] md:px-8 md:py-9">
            <p className="journal-entry-label !border-white/40 !bg-white/10 !text-white">
              Featured tray
            </p>
            <p className="font-display mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Stories that stayed with me
            </p>
          </div>
        </div>

        <div className="journal-ruled border-t border-dashed border-border bg-surface-soft p-4 sm:p-5 md:p-6">
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="panel-interactive group flex gap-3 border-dashed p-3 sm:gap-4 sm:p-4"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-border bg-white sm:h-24 sm:w-24">
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
        </div>
      </div>
    </Section>
  );
}
