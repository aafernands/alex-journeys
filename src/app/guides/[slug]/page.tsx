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
import {
  getPostBySlug,
  getPostsByGuideHub,
  type PostMeta,
} from "@/lib/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trip?: string | string[] }>;
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
      tone={isPlanner ? "default" : "white"}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/guides", label: "Guides" },
        { label: hub.title },
      ]}
    >
      {plannerConfig ? (
        <TripPlanner
          config={plannerConfig}
          partners={plannerPartners}
          urlTripId={rawTrip?.trim() || null}
          journalPlaces={getAllDestinations().map(
            (dest) => `${destinationCity(dest)}, ${dest.name}`,
          )}
        />
      ) : null}

      {plannerConfig ? (
        <div className="mt-14 border-t border-border pt-10">
          <p className="eyebrow">{plannerConfig.guidesEyebrow}</p>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-heading md:text-4xl">
            {plannerConfig.guidesHeading}
          </h2>
        </div>
      ) : (
        <div className="hub-follow inline-flex items-center gap-2 rounded-full bg-surface-soft px-3 py-1.5 text-sm font-semibold text-heading">
          <NavIcon name={hub.icon} size={16} className="text-accent" />
          {posts.length + pages.length}{" "}
          {posts.length + pages.length === 1 ? "note" : "notes"} from the journal
        </div>
      )}

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
                  <span className="card-title block">
                    {page.title}
                  </span>
                  {page.description ? (
                    <span className="mt-1 block text-sm text-text">
                      {page.description}
                    </span>
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
    </SitePage>
  );
}
