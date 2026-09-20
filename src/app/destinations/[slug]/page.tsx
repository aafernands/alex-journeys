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
  if (!dest) return { title: "Place" };
  return {
    title: dest.name,
    description: dest.blurb || `Notes from my trip to ${dest.name} — Fernandes Journeys.`,
    alternates: { canonical: `/destinations/${slug}` },
    openGraph: {
      title: dest.name,
      description: dest.blurb,
      type: "website",
      url: `/destinations/${slug}`,
      images: dest.image ? [{ url: dest.image, alt: dest.imageAlt }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: dest.name,
      description: dest.blurb,
      images: dest.image ? [dest.image] : undefined,
    },
  };
}

export default async function DestinationPage({ params }: PageProps) {
  const { slug } = await params;
  const dest = getDestinationBySlug(slug);
  if (!dest) notFound();

  const related = getPostsByDestination(slug);

  return (
    <main className="bg-white">
      <div className="section-shell py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="text-link transition hover:text-accent">
                Home
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link
                href="/destinations"
                className="text-link transition hover:text-accent"
              >
                Destinations
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="text-text">{dest.name}</li>
          </ol>
        </nav>

        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <Image
            src={dest.image}
            alt={dest.imageAlt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        <p className="mt-8 eyebrow">
          {dest.continent}
          {dest.region !== dest.continent ? ` · ${dest.region}` : ""}
        </p>
        <h1 className="font-display mt-2 text-display text-heading">
          {dest.name}
        </h1>
        <p className="mt-6 text-lead text-text">{dest.blurb}</p>

        {related.length > 0 ? (
          <section className="mt-12" aria-labelledby="related-posts-heading">
            <h2
              id="related-posts-heading"
              className="font-display text-title text-heading"
            >
              Related stories
            </h2>
            <ul className="mt-6 flex flex-col gap-4">
              {related.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="panel-interactive group flex gap-4 overflow-hidden p-3 sm:p-4"
                  >
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-surface sm:h-24 sm:w-32">
                      {post.featuredImage ? (
                        <Image
                          src={post.featuredImage.url}
                          alt=""
                          fill
                          sizes="128px"
                          className="object-cover"
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
                      <p className="font-display mt-1 text-lg font-semibold leading-snug text-heading transition group-hover:text-accent sm:text-xl">
                        {post.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-text">
                        {post.excerpt}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="panel-soft mt-10 border-dashed px-6 py-16 text-center">
            <p className="eyebrow">Photo space</p>
            <p className="font-display mt-3 text-2xl text-text">
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
            className="btn btn-secondary"
          >
            ← All places
          </Link>
          <Link
            href="/blog"
            className="btn btn-primary"
          >
            Browse stories
          </Link>
        </div>
      </div>
      </div>
    </main>
  );
}
