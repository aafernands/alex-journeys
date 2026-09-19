import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  destinationSlugs,
  getDestinationBySlug,
} from "@/data/destinations";

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

        <p className="sample-badge mt-8">Sample content · replace freely</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sage">
          {dest.continent}
          {dest.region !== dest.continent ? ` · ${dest.region}` : ""}
        </p>
        <h1 className="font-display mt-2 text-4xl tracking-tight text-ink sm:text-5xl md:text-6xl">
          {dest.name}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{dest.blurb}</p>

        <div className="mt-10 rounded-2xl border border-dashed border-sand bg-cream-deep/60 px-6 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Photo space
          </p>
          <p className="font-display mt-3 text-2xl text-ink-soft">
            Room for trip photos later
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Drop images here when you’re ready — galleries, maps, or a single
            hero shot from the road.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/destinations"
            className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-terracotta/40 hover:text-terracotta"
          >
            ← All destinations
          </Link>
          <Link
            href="/#stories"
            className="inline-flex items-center justify-center rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-terracotta-deep"
          >
            Recent trip stories
          </Link>
        </div>
      </div>
    </main>
  );
}
