import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostForm } from "@/components/cms/PostForm";
import { getAllDestinations } from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { getDraftBySlug, type DraftPost } from "@/lib/cms/drafts";
import {
  fetchDraftFromGithub,
  fetchPostFromGithub,
  isGithubConfigured,
} from "@/lib/cms/github";
import { sanitizeSlug } from "@/lib/cms/validate";
import type { Post } from "@/lib/post-types";
import { getPostBySlug } from "@/lib/posts";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
};

type EditableSource = DraftPost | Post;

async function loadDraft(slug: string): Promise<DraftPost | null> {
  if (isGithubConfigured()) {
    try {
      const fromGh = await fetchDraftFromGithub(slug);
      // Null from GitHub is authoritative (e.g. draft promoted/deleted) —
      // do not revive a stale deploy-snapshot file.
      if (!fromGh?.slug || !fromGh?.title) return null;
      return {
        slug: fromGh.slug,
        title: fromGh.title,
        date: fromGh.date,
        status: "draft",
        excerpt: fromGh.excerpt ?? "",
        featuredImage: fromGh.featuredImage ?? null,
        destinations: fromGh.destinations ?? [],
        guideHubs: fromGh.guideHubs,
        bookingTools: fromGh.bookingTools,
        bookingDestination: fromGh.bookingDestination,
        experienceWidgetHtml: fromGh.experienceWidgetHtml,
        contentHtml: fromGh.contentHtml ?? "",
        itinerary: fromGh.itinerary,
        source: fromGh.source,
      };
    } catch {
      // Network/API error — fall back to local filesystem
    }
  }
  return getDraftBySlug(slug);
}

async function loadPost(slug: string): Promise<Post | null> {
  if (isGithubConfigured()) {
    try {
      const fromGh = await fetchPostFromGithub(slug);
      if (fromGh?.slug && fromGh?.title) return fromGh;
      // Prefer GitHub when configured; fall back if missing (pre-deploy local).
    } catch {
      // Network/API error — fall back to local filesystem
    }
  }
  return getPostBySlug(slug);
}

export default async function CmsEditPostPage({ params, searchParams }: PageProps) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const { slug: raw } = await params;
  const { draft: draftParam } = await searchParams;
  const slug = sanitizeSlug(raw);
  if (!slug) notFound();

  const wantDraft = draftParam === "1" || draftParam === "true";
  const draft = wantDraft ? await loadDraft(slug) : null;
  const post = !draft ? await loadPost(slug) : null;
  if (!draft && !post) notFound();

  const source: EditableSource = draft ?? post!;
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
          updatedAt:
            "updatedAt" in source && typeof source.updatedAt === "string"
              ? source.updatedAt
              : undefined,
          excerpt: source.excerpt,
          contentHtml: source.contentHtml,
          featuredImageUrl: source.featuredImage?.url ?? "",
          featuredImageAlt: source.featuredImage?.alt ?? "",
          destinations: source.destinations,
          guideHubs: "guideHubs" in source ? (source.guideHubs ?? []) : [],
          bookingTools: "bookingTools" in source ? (source.bookingTools ?? []) : [],
          bookingDestination:
            "bookingDestination" in source ? (source.bookingDestination ?? "") : "",
          experienceWidgetHtml:
            "experienceWidgetHtml" in source ? (source.experienceWidgetHtml ?? "") : "",
          itinerary:
            "itinerary" in source ? (source.itinerary ?? undefined) : undefined,
        }}
      />
    </div>
  );
}
