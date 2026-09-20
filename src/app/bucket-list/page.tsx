import type { Metadata } from "next";
import { PostCard } from "@/components/blog/PostCard";
import { SitePage } from "@/components/pages/SitePage";
import { bucketListSlugs } from "@/data/hubs";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";
import { getPostBySlug } from "@/lib/posts";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("bucket-list", PAGE_DEFAULTS["bucket-list"]);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: "/bucket-list" },
  };
}

export default function BucketListPage() {
  const page = getPageWithFallback("bucket-list", PAGE_DEFAULTS["bucket-list"]);
  const posts = bucketListSlugs
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <SitePage
      label={page.label}
      title={page.title}
      description={page.description}
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/guides/experiences", label: "Experiences" },
        { label: "Bucket list" },
      ]}
    >
      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {posts.map((post, i) => (
          <li key={post.slug}>
            <PostCard post={post} priority={i < 3} />
          </li>
        ))}
      </ul>
    </SitePage>
  );
}
