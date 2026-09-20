import Link from "next/link";
import { redirect } from "next/navigation";
import { PostsList } from "@/components/cms/PostsList";
import { getAllDestinations } from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { getAllDrafts } from "@/lib/cms/drafts";
import { formatPostDate, getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function CmsPostsPage({ searchParams }: PageProps) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const { status } = await searchParams;
  const posts = getAllPosts();
  const drafts = getAllDrafts();
  const destinations = getAllDestinations().map((d) => ({
    slug: d.slug,
    name: d.name,
  }));

  const items = [
    ...posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      dateLabel: formatPostDate(p.date),
      excerpt: p.excerpt,
      destinations: p.destinations,
      kind: "published" as const,
    })),
    ...drafts.map((d) => ({
      slug: d.slug,
      title: d.title,
      date: d.date,
      dateLabel: formatPostDate(d.date),
      excerpt: d.excerpt,
      destinations: d.destinations || [],
      kind: "draft" as const,
    })),
  ].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-accent">Stories</p>
          <h1 className="font-display mt-2 text-display text-heading">Posts</h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Search, filter, edit, duplicate, or delete. Published posts live at{" "}
            <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
              /blog/&#123;slug&#125;
            </code>
            .
          </p>
        </div>
        <Link href="/cms/new" className="btn btn-primary">
          New post
        </Link>
      </div>
      <PostsList
        posts={items}
        destinations={destinations}
        initialStatus={status}
      />
    </div>
  );
}
