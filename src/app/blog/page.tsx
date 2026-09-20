import type { Metadata } from "next";
import Link from "next/link";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { asString } from "@/lib/cms-section-utils";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";
import { getAllPosts } from "@/lib/posts";

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
    <main className="bg-white">
      <div className="section-shell py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="text-link transition hover:text-accent">
                Home
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="text-text">{page.title}</li>
          </ol>
        </nav>

        {page.label ? <p className="mt-8 eyebrow">{page.label}</p> : null}
        <h1
          className={`font-display text-display text-heading ${
            page.label ? "mt-2" : "mt-8"
          }`}
        >
          {page.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-text">{intro}</p>

        <BlogFilters posts={posts} />
      </div>
    </main>
  );
}
