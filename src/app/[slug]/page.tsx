import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { DestinationCountryView } from "@/components/destinations/DestinationCountryView";
import { SitePage } from "@/components/pages/SitePage";
import {
  destinationSlugs,
  getDestinationBySlug,
} from "@/data/destinations";
import { getPageBySlug, getAllCmsPages } from "@/lib/pages";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";
import {
  resolvedSeoDescription,
  resolvedSeoTitle,
} from "@/lib/post-seo";
import {
  publicDestinationPath,
  publicPostPath,
} from "@/lib/public-paths";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/** Slugs that must not be served as generic CMS pages via catch-all. */
const RESERVED_CATCHALL_SLUGS = new Set([
  "account",
  "login",
  "search",
  "cms",
  "api",
  "blog",
  "destinations",
  "guides",
  "tools",
  "about",
  "contact",
  "start-here",
  "bucket-list",
  "media-kit",
  "app",
  "culinary",
  "policies",
  "privacy",
  "terms",
  "affiliate-disclosure",
  "travel-wallet",
  "out",
  "forgot-password",
  "reset-password",
]);

export function generateStaticParams() {
  const dest = destinationSlugs.map((slug) => ({ slug }));
  const posts = getPostSlugs().map((slug) => ({ slug }));
  const cmsOnly = getAllCmsPages()
    .map((p) => p.slug)
    .filter((slug) => !RESERVED_CATCHALL_SLUGS.has(slug))
    .filter((slug) => !destinationSlugs.includes(slug))
    .filter((slug) => !getPostSlugs().includes(slug))
    .map((slug) => ({ slug }));
  return [...dest, ...posts, ...cmsOnly];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const dest = getDestinationBySlug(slug);
  if (dest) {
    const path = publicDestinationPath(slug);
    return {
      title: dest.name,
      description:
        dest.blurb ||
        `Notes from my trip to ${dest.name} — Alex Journeys.`,
      alternates: { canonical: path },
      openGraph: {
        title: dest.name,
        description: dest.blurb,
        type: "website",
        url: path,
        images: dest.image
          ? [{ url: dest.image, alt: dest.imageAlt }]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: dest.name,
        description: dest.blurb,
        images: dest.image ? [dest.image] : undefined,
      },
    };
  }

  const post = getPostBySlug(slug);
  if (post) {
    const path = publicPostPath(slug);
    return buildPageMetadata({
      title: resolvedSeoTitle(post),
      description: resolvedSeoDescription(post),
      path,
      image: post.featuredImage?.url,
      imageAlt: post.featuredImage?.alt || post.title,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updatedAt ?? post.date,
    });
  }

  if (!RESERVED_CATCHALL_SLUGS.has(slug)) {
    const page = getPageBySlug(slug);
    if (page) {
      return {
        title: page.title,
        description: page.description,
        alternates: { canonical: `/${slug}` },
      };
    }
  }

  return { title: "Not found" };
}

/**
 * Root slug resolver: destination country pages win over posts when both
 * match (they currently never overlap). Explicit App Router segments
 * (about, blog, destinations, cms, …) already take precedence over this
 * dynamic route. Remaining CMS-only pages (future marketing pages without
 * a dedicated route file) are served last.
 */
export default async function PublicSlugPage({ params }: PageProps) {
  const { slug } = await params;

  if (getDestinationBySlug(slug)) {
    return <DestinationCountryView slug={slug} />;
  }

  if (getPostBySlug(slug)) {
    return <BlogPostView slug={slug} />;
  }

  if (!RESERVED_CATCHALL_SLUGS.has(slug)) {
    const page = getPageBySlug(slug);
    if (page) {
      return (
        <SitePage
          cmsSlug={page.slug}
          label={page.label}
          title={page.title}
          description={page.description}
          html={page.contentHtml}
          path={`/${slug}`}
          crumbs={[
            { href: "/", label: "Home" },
            { label: page.title },
          ]}
        />
      );
    }
  }

  notFound();
}
