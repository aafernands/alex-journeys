import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/blog/PostCard";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { TripPlanner } from "@/components/trip-planner/TripPlanner";
import {
  getGuideHub,
  getGuideHubSlugs,
} from "@/data/guides";
import { cmsEditPageHref } from "@/lib/admin-edit";
import {
  getPostBySlug,
  getPostsByGuideHub,
  type PostMeta,
} from "@/lib/posts";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getGuideHubSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hub = getGuideHub(slug);
  if (!hub) return { title: "Guides" };
  return {
    title: hub.title,
    description: hub.description,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      title: hub.title,
      description: hub.description,
      type: "website",
      url: `/guides/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: hub.title,
      description: hub.description,
    },
  };
}

export default async function GuideHubPage({ params }: PageProps) {
  const { slug } = await params;
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

  const isPlanner = slug === "plan-a-trip";

  return (
    <SitePage
      adminEdit={{
        href: cmsEditPageHref("guides"),
        label: "Edit guides hub",
      }}
      label="Guides"
      title={hub.title}
      description={
        isPlanner
          ? "Start with what you need — flights, a stay, a car, or all three. I’ll hand you next steps with the tools I actually use."
          : hub.description
      }
      narrow={false}
      tone={isPlanner ? "default" : "white"}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/guides", label: "Guides" },
        { label: hub.title },
      ]}
    >
      {isPlanner ? <TripPlanner /> : null}

      {isPlanner ? (
        <div className="mt-14 border-t border-border pt-10">
          <p className="eyebrow">From the journal</p>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-heading md:text-4xl">
            Notes from trips I’ve already walked
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
