import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostForm } from "@/components/cms/PostForm";
import { getAllDestinations } from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { getDraftBySlug } from "@/lib/cms/drafts";
import { sanitizeSlug } from "@/lib/cms/validate";
import { getPostBySlug } from "@/lib/posts";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
};

export default async function CmsEditPostPage({ params, searchParams }: PageProps) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const { slug: raw } = await params;
  const { draft: draftParam } = await searchParams;
  const slug = sanitizeSlug(raw);
  if (!slug) notFound();

  const wantDraft = draftParam === "1" || draftParam === "true";
  const draft = wantDraft ? getDraftBySlug(slug) : null;
  const post = !draft ? getPostBySlug(slug) : null;
  if (!draft && !post) notFound();

  const source = draft ?? post!;
  const destinations = getAllDestinations().map((d) => ({
    slug: d.slug,
    name: d.name,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/cms/posts"
          className="text-sm text-link transition hover:text-accent"
        >
          ← Posts
        </Link>
        <p className="eyebrow mt-6 text-accent">
          {draft ? "Edit draft" : "Edit"}
        </p>
        <h1 className="font-display mt-2 text-display text-heading">
          {source.title}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {draft
            ? "Saving as draft updates drafts/; Publish promotes to posts/ and removes the draft."
            : "Updates the JSON on GitHub and refreshes the posts index."}
        </p>
      </div>
      <PostForm
        destinations={destinations}
        mode="edit"
        isDraft={Boolean(draft)}
        initial={{
          title: source.title,
          slug: source.slug,
          date: source.date,
          excerpt: source.excerpt,
          contentHtml: source.contentHtml,
          featuredImageUrl: source.featuredImage?.url ?? "",
          featuredImageAlt: source.featuredImage?.alt ?? "",
          destinations: source.destinations,
          guideHubs: "guideHubs" in source ? (source.guideHubs ?? []) : [],
        }}
      />
    </div>
  );
}
