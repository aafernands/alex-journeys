import type { Metadata } from "next";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { asString } from "@/lib/cms-section-utils";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";
import { getAllPosts } from "@/lib/posts";
import { SitePage } from "@/components/pages/SitePage";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("blog", PAGE_DEFAULTS.blog);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: "/blog" },
  };
}

export default function BlogIndexPage() {
  const page = getPageWithFallback("blog", PAGE_DEFAULTS.blog);
  const posts = getAllPosts();
  const template = asString(
    page.sections?.introTemplate,
    "{count} stories from the road — destination guides, trip notes, and practical travel tips. Filter by place or guide topic.",
  );
  const intro = template.replace("{count}", String(posts.length));

  return (
    <SitePage
      cmsSlug="blog"
      label={page.label}
      title={page.title}
      description={intro}
      narrow={false}
      comfortableClass="journal-page"
      crumbs={[
        { href: "/", label: "Home" },
        { label: page.title },
      ]}
    >
      <BlogFilters posts={posts} />
    </SitePage>
  );
}
