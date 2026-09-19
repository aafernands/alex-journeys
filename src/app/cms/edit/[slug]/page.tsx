import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostForm } from "@/components/cms/PostForm";
import { getAllDestinations } from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { sanitizeSlug } from "@/lib/cms/validate";
import { getPostBySlug } from "@/lib/posts";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CmsEditPostPage({ params }: PageProps) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const { slug: raw } = await params;
  const slug = sanitizeSlug(raw);
  if (!slug) notFound();

  const post = getPostBySlug(slug);
  if (!post) notFound();

  const destinations = getAllDestinations().map((d) => ({
    slug: d.slug,
    name: d.name,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/cms"
          className="text-sm text-link transition hover:text-accent"
        >
          ← Dashboard
        </Link>
        <p className="eyebrow mt-6 text-accent">Edit</p>
        <h1 className="font-display mt-2 text-display text-heading">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Updates the JSON on GitHub and refreshes the posts index. Source will
          be marked <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">cms</code>.
        </p>
      </div>
      <PostForm
        destinations={destinations}
        mode="edit"
        initial={{
          title: post.title,
          slug: post.slug,
          date: post.date,
          excerpt: post.excerpt,
          contentHtml: post.contentHtml,
          featuredImageUrl: post.featuredImage?.url ?? "",
          featuredImageAlt: post.featuredImage?.alt ?? "",
          destinations: post.destinations,
        }}
      />
    </div>
  );
}
