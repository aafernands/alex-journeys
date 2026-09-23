import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, CalendarDays, Plane } from "lucide-react";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/blog/PostCard";
import { destinationCity, getAllDestinations } from "@/data/destinations";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { TripPlanner } from "@/components/trip-planner/TripPlanner";
import {
  getGuideHub,
  getGuideHubSlugs,
} from "@/data/guides";
import { PLAN_A_TRIP_SLUG } from "@/lib/trip-planner-model";
import {
  getTripPlannerConfig,
  getTripPlannerPartners,
} from "@/lib/trip-planner";
import { cmsEditPageHref } from "@/lib/admin-edit";
import {
  getAllPosts,
  getPostBySlug,
  getPostsByGuideHub,
  type PostMeta,
} from "@/lib/posts";

function GuideIndex({
  pages,
  posts,
}: {
  pages: { title: string; href: string; description?: string }[];
  posts: PostMeta[];
}) {
  return (
    <>
      {pages.length > 0 ? (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {pages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="panel-interactive group flex h-full gap-4 p-5"
              >
                <span className="icon-tile">
                  <NavIcon name="book-open" size={20} />
                </span>
                <span>
                  <span className="card-title block">{page.title}</span>
                  {page.description ? (
                    <span className="mt-1 block text-sm text-text">{page.description}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {posts.length > 0 ? (
        <ul className="hub-follow grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.slug}>
              <PostCard post={post} priority={i < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-text">
          More notes coming soon. Meanwhile, browse the{" "}
          <Link href="/blog" className="text-link hover:text-accent">
            full blog
          </Link>
          .
        </p>
      )}
    </>
  );
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    trip?: string | string[];
    stay?: string | string[];
    flight?: string | string[];
  }>;
};

export function generateStaticParams() {
  return getGuideHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hub = getGuideHub(slug);
  if (!hub) return { title: "Guides" };
  const planner = slug === PLAN_A_TRIP_SLUG ? getTripPlannerConfig() : null;
  const title = planner?.title || hub.title;
  const description = planner?.intro || hub.description;
  return {
    title,
    description,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/guides/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function GuideHubPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const rawTrip = Array.isArray(query.trip) ? query.trip[0] : query.trip;
  const rawStay = Array.isArray(query.stay) ? query.stay[0] : query.stay;
  const rawFlight = Array.isArray(query.flight) ? query.flight[0] : query.flight;
  const hub = getGuideHub(slug);
  if (!hub) notFound();

  const postsBySlug = new Map<string, PostMeta>();
  const pages: { title: string; href: string; description?: string }[] = [];

  for (const link of hub.links) {
    if (link.kind === "page") {
      pages.push({
        title: link.title,
        href: link.href,
        description: link.description,
      });
      continue;
    }
    const slugFromHref = link.href.replace(/^\//, "").replace(/^blog\//, "");
    const post = getPostBySlug(slugFromHref);
    if (post) {
      const { contentHtml: _c, source: _s, itinerary: _i, ...meta } = post;
      postsBySlug.set(meta.slug, meta);
    }
  }

  for (const meta of getPostsByGuideHub(slug)) {
    if (!postsBySlug.has(meta.slug)) {
      postsBySlug.set(meta.slug, meta);
    }
  }

  const posts = [...postsBySlug.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const isPlanner = slug === PLAN_A_TRIP_SLUG;
  const plannerConfig = isPlanner ? getTripPlannerConfig() : null;
  const plannerPartners = isPlanner ? getTripPlannerPartners() : [];

  return (
    <SitePage
      adminEdit={
        isPlanner
          ? { href: "/cms/trip-planner", label: "Edit trip planner" }
          : {
              href: cmsEditPageHref("guides"),
              label: "Edit guides hub",
            }
      }
      extraAdminLinks={
        isPlanner
          ? [{ href: cmsEditPageHref("guides"), label: "Edit guides hub" }]
          : undefined
      }
      label={plannerConfig?.label || "Guides"}
      title={plannerConfig?.title || hub.title}
      description={plannerConfig?.intro || hub.description}
      narrow={false}
      compact={isPlanner}
      planFlow={isPlanner}
      hideHeader={isPlanner}
      tone={isPlanner ? "default" : "white"}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/guides", label: "Guides" },
        { label: hub.title },
      ]}
    >
      {plannerConfig ? (
        <div className="plan-hotel-page">
          <nav aria-label="Planner navigation" className="mb-4 text-sm text-muted">
            <Link href="/guides" className="text-link transition hover:text-accent">
              ← Back to guides
            </Link>
          </nav>

          <section id="overview" className="border-b border-border pb-8 sm:pb-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="eyebrow">Trip planner</p>
                <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl lg:text-5xl">
                  {plannerConfig.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-text sm:text-lg">
                  {plannerConfig.intro}
                </p>
              </div>
              <a href="#planner" className="btn btn-primary hidden lg:inline-flex">
                Start planning
              </a>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <div className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
                  <Plane className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-heading">Flights</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Compare routes and keep your flight search connected to the same trip.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
                  <BedDouble className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-heading">Stays</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Search hotels, compare rooms, and return to your itinerary without starting over.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-heading">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-heading">Itinerary</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Keep bookings, notes, and the day-by-day plan together in one place.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <nav
            aria-label="Plan a trip sections"
            className="sticky top-0 z-20 -mx-5 flex gap-1 overflow-x-auto border-b border-border bg-bg/95 px-5 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0"
          >
            <a href="#overview" className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-heading hover:bg-surface">
              Overview
            </a>
            <a href="#planner" className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-heading hover:bg-surface">
              Planner
            </a>
            <a href="#travel-notes" className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-heading hover:bg-surface">
              Travel notes
            </a>
          </nav>
        </div>
      ) : null}

      {plannerConfig ? (
        <section id="planner" className="scroll-mt-28 plan-hotel-planner-section">
          <div className="mb-6 border-b border-border pb-6 sm:mb-8 sm:pb-8">
            <p className="eyebrow">Build your trip</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-heading sm:text-3xl">
              Start with the basics
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Choose what you need first. You can add flights, stays, bookings, and itinerary details as you go.
            </p>
          </div>
          <TripPlanner
          config={plannerConfig}
          partners={plannerPartners}
          urlTripId={rawTrip?.trim() || null}
          focusStay={rawStay === "booked"}
          focusFlight={rawFlight === "booked"}
          journalPlaces={getAllDestinations().map(
            (dest) => `${destinationCity(dest)}, ${dest.name}`,
          )}
          journalNotes={getAllPosts().map((post) => ({
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            date: post.date,
            destinations: post.destinations,
          }))}
          journalPlaceIndex={getAllDestinations().map((dest) => ({
            slug: dest.slug,
            name: dest.name,
            city: destinationCity(dest),
          }))}
        />
        </section>
      ) : null}

      {plannerConfig ? (
        <div id="travel-notes" className="mt-14 hidden scroll-mt-28 border-t border-border pt-10 sm:block">
          <p className="eyebrow">{plannerConfig.guidesEyebrow}</p>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-heading md:text-4xl">
            {plannerConfig.guidesHeading}
          </h2>
          <GuideIndex pages={pages} posts={posts} />
        </div>
      ) : (
        <div className="hub-follow inline-flex items-center gap-2 rounded-full bg-surface-soft px-3 py-1.5 text-sm font-semibold text-heading">
          <NavIcon name={hub.icon} size={16} className="text-accent" />
          {posts.length + pages.length}{" "}
          {posts.length + pages.length === 1 ? "note" : "notes"} from the journal
        </div>
      )}

      {plannerConfig ? null : <GuideIndex pages={pages} posts={posts} />}
    </SitePage>
  );
}
