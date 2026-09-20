import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/blog/BlogPostView";
import { DestinationCountryView } from "@/components/destinations/DestinationCountryView";
import {
  destinationSlugs,
  getDestinationBySlug,
} from "@/data/destinations";
import { getPostBySlug, getPostSlugs } from "@/lib/posts";
import {
  publicDestinationPath,
  publicPostPath,
} from "@/lib/public-paths";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  const dest = destinationSlugs.map((slug) => ({ slug }));
  const posts = getPostSlugs().map((slug) => ({ slug }));
  return [...dest, ...posts];
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
        `Notes from my trip to ${dest.name} — Fernandes Journeys.`,
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
    const description = post.excerpt || `Travel story: ${post.title}`;
    const images = post.featuredImage
      ? [
          {
            url: post.featuredImage.url,
            alt: post.featuredImage.alt || post.title,
          },
        ]
      : undefined;
    return {
      title: post.title,
      description,
      alternates: { canonical: path },
      openGraph: {
        title: post.title,
        description,
        type: "article",
        publishedTime: post.date,
        modifiedTime: post.date,
        url: path,
        images,
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description,
        images: post.featuredImage ? [post.featuredImage.url] : undefined,
      },
    };
  }

  return { title: "Not found" };
}

/**
 * Root slug resolver: destination country pages win over posts when both
 * match (they currently never overlap). Static App Router segments
 * (about, blog, destinations, cms, …) already take precedence over this
 * dynamic route.
 */
export default async function PublicSlugPage({ params }: PageProps) {
  const { slug } = await params;

  if (getDestinationBySlug(slug)) {
    return <DestinationCountryView slug={slug} />;
  }

  if (getPostBySlug(slug)) {
    return <BlogPostView slug={slug} />;
  }

  notFound();
}
