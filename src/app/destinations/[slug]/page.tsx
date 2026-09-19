import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  destinationSlugs,
  getDestinationBySlug,
} from "@/data/destinations";
import {
  formatPostDateShort,
  getPostsByDestination,
} from "@/lib/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return destinationSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) return { title: "Destination" };
  return {
    title: dest.name,
    description: `Notes from my trip to ${dest.name} — Fernandes Journeys.`,
  };
}

export default async function DestinationPage({ params }: PageProps) {
  const { slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) notFound();

  const related = getPostsByDestination(slug);

  return (
    <main className="border-b border-sand/50 bg-cream">
      <div className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition hover:text-terracotta">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href="/destinations"
                className="transition hover:text-terracotta"
              >
                Destinations
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink-soft">{dest.name}</li>
          </ol>
        </nav>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-sage">
          {dest.continent}
          {dest.region !== dest.continent ? ` · ${dest.region}` : ""}
        </p>
        <h1 className="font-display mt-2 text-4xl tracking-tight text-ink sm:text-5xl md:text-6xl">
          {dest.name}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{dest.blurb}</p>

        {related.length > 0 ? (
          <section className="mt-12" aria-labelledby="related-posts-heading">
            <h2
              id="related-posts-heading"
              className="font-display text-2xl tracking-tight text-ink md:text-3xl"
            >
              Related stories
            </h2>
            <ul className="mt-6 flex flex-col gap-4">
              {related.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex gap-4 overflow-hidden rounded-xl border border-sand/70 bg-surface p-3 transition hover:border-terracotta/30 hover:shadow-md sm:p-4"
                  >
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-cream-deep sm:h-24 sm:w-32">
                      {post.featuredImage ? (
                        <Image
                          src={post.featuredImage.url}
                          alt=""
                          fill
                          sizes="128px"
                          className="object-cover transition group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <time
                        className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"
                        dateTime={post.date}
                      >
                        {formatPostDateShort(post.date)}
                      </time>
                      <p className="font-display mt-1 text-lg leading-snug text-ink transition group-hover:text-terracotta sm:text-xl">
                        {post.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                        {post.excerpt}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-sand bg-cream-deep/60 px-6 py-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Photo space
            </p>
            <p className="font-display mt-3 text-2xl text-ink-soft">
              Room for trip photos later
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              More dispatches for {dest.name} will show up here as they&apos;re
              written.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/destinations"
            className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-terracotta/40 hover:text-terracotta"
          >
            ← All destinations
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-terracotta-deep"
          >
            Browse the blog
          </Link>
        </div>
      </div>
    </main>
  );
}
