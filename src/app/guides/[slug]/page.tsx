import type { Metadata } from "next";
import Link from "next/link";
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
import { collectPackingGuides } from "@/lib/packing-guides";
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
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {pages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="panel-interactive group flex h-full gap-4 p-4"
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
        <p className="mt-8 text-text">
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
      comfortableClass={isPlanner ? undefined : "guides-page"}
      tone={isPlanner ? "default" : "white"}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/guides", label: "Guides" },
        { label: hub.title },
      ]}
    >
      {plannerConfig ? (
        <section id="planner" className="scroll-mt-28 plan-hotel-planner-section">
          <div className="mb-5">
            <p className="eyebrow">Trip planner</p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-heading sm:text-4xl">
              Plan your trip
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Destination, dates, travelers, and what you still need to book.
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
          packingGuides={collectPackingGuides(getAllPosts())}
        />
        </section>
      ) : null}

      {plannerConfig ? null : <GuideIndex pages={pages} posts={posts} />}
    </SitePage>
  );
}
