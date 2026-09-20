import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DestinationClimate } from "@/components/destinations/DestinationClimate";
import { DestinationItinerary } from "@/components/destinations/DestinationItinerary";
import { DestinationQuickFacts } from "@/components/destinations/DestinationQuickFacts";
import { DestinationMap } from "@/components/destinations/DestinationMap";
import { getDestinationBySlug } from "@/data/destinations";
import {
  formatPostDateShort,
  getPostsByDestination,
} from "@/lib/posts";
import { publicPostPath } from "@/lib/public-paths";

type DestinationCountryViewProps = {
  slug: string;
};

export async function DestinationCountryView({
  slug,
}: DestinationCountryViewProps) {
  const dest = getDestinationBySlug(slug);
  if (!dest) notFound();

  const related = getPostsByDestination(slug);
  const coverImages = dest.coverImages?.length
    ? dest.coverImages
    : undefined;
  const featuredHref = dest.featuredPostSlug
    ? publicPostPath(dest.featuredPostSlug)
    : related[0]
      ? publicPostPath(related[0].slug)
      : null;

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

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <p className="eyebrow">
              {dest.continent}
              {dest.region !== dest.continent ? ` · ${dest.region}` : ""}
            </p>
            {dest.tripLabel ? (
              <span className="rounded-full border border-border bg-surface-soft px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
                {dest.tripLabel}
              </span>
            ) : null}
          </div>
          <h1 className="font-display mt-2 text-display text-heading">
            {dest.name}
          </h1>
          <p className="mt-6 text-lead text-text">{dest.blurb}</p>

          <DestinationQuickFacts
            quickFacts={dest.quickFacts}
            climateBestTime={dest.climate?.bestTime}
          />

          {dest.highlights && dest.highlights.length > 0 ? (
            <section className="mt-10" aria-labelledby="trip-highlights-heading">
              <h2
                id="trip-highlights-heading"
                className="font-display text-title text-heading"
              >
                Trip highlights
              </h2>
              <ul className="mt-5 space-y-3">
                {dest.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-text"
                  >
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    <span className="text-[0.95rem] leading-relaxed sm:text-base">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <DestinationItinerary
            itinerary={dest.itinerary}
            featuredPostSlug={dest.featuredPostSlug}
          />

          {dest.climate ? (
            <DestinationClimate
              destinationName={dest.name}
              climate={dest.climate}
            />
          ) : null}

          {dest.map ? (
            <DestinationMap destinationName={dest.name} map={dest.map} />
          ) : null}

          {coverImages ? (
            <section className="mt-12" aria-labelledby="photo-strip-heading">
              <h2
                id="photo-strip-heading"
                className="font-display text-title text-heading"
              >
                From the trip
              </h2>
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {coverImages.map((img) => (
                  <li
                    key={img.src}
                    className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 45vw, 180px"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section className="mt-12" aria-labelledby="related-posts-heading">
              <h2
                id="related-posts-heading"
                className="font-display text-title text-heading"
              >
                Stories from this place
              </h2>
              <ul className="mt-6 flex flex-col gap-4">
                {related.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={publicPostPath(post.slug)}
                      className="panel-interactive group flex gap-4 overflow-hidden p-3 sm:p-4"
                    >
                      <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-surface sm:h-28 sm:w-36">
                        {post.featuredImage ? (
                          <Image
                            src={post.featuredImage.url}
                            alt=""
                            fill
                            sizes="144px"
                            className="object-cover transition duration-300 group-hover:scale-[1.03]"
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
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text">
                          {post.excerpt}
                        </p>
                        <span className="mt-2 inline-block text-sm font-semibold text-link transition group-hover:text-accent">
                          Read story →
                        </span>
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
            <Link href="/destinations" className="btn btn-secondary">
              ← All places
            </Link>
            {featuredHref ? (
              <Link href={featuredHref} className="btn btn-primary">
                Read the trip journal
              </Link>
            ) : (
              <Link href="/blog" className="btn btn-primary">
                Browse stories
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
