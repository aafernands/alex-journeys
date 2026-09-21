import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminPublicChrome,
  AdminSectionEdit,
} from "@/components/admin/AdminPublicChrome";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { cmsEditPageHref } from "@/lib/admin-edit";
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
  const editHref = cmsEditPageHref("blog");

  return (
    <main className="bg-white">
      <AdminPublicChrome
        editHref={editHref}
        editLabel="Edit page"
        showChip={false}
      />
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
        <div
          className={`flex flex-wrap items-start justify-between gap-3 ${
            page.label ? "mt-2" : "mt-8"
          }`}
        >
          <h1 className="font-display text-display text-heading">
            {page.title}
          </h1>
          <AdminSectionEdit href={editHref} label="Edit page" />
        </div>
        <p className="mt-4 max-w-2xl text-lead text-text">{intro}</p>

        <BlogFilters posts={posts} />
      </div>
    </main>
  );
}
