import Link from "next/link";
import { redirect } from "next/navigation";
import { PostForm } from "@/components/cms/PostForm";
import { getAllDestinations } from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { getDraftBySlug } from "@/lib/cms/drafts";
import {
  fetchDraftFromGithub,
  fetchPostFromGithub,
  isGithubConfigured,
} from "@/lib/cms/github";
import { sanitizeSlug } from "@/lib/cms/validate";
import { getPostBySlug } from "@/lib/posts";
import { getSeoLinkCatalog } from "@/lib/seo-catalog";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ duplicate?: string; fromDraft?: string }>;
};

async function loadDuplicateSource(slug: string, fromDraft: boolean) {
  if (isGithubConfigured()) {
    try {
      if (fromDraft) {
        const fromGh = await fetchDraftFromGithub(slug);
        if (fromGh?.slug && fromGh?.title) return fromGh;
      } else {
        const fromGh = await fetchPostFromGithub(slug);
        if (fromGh?.slug && fromGh?.title) return fromGh;
      }
    } catch {
      // fall through
    }
  }
  return fromDraft ? getDraftBySlug(slug) : getPostBySlug(slug);
}

export default async function CmsNewPostPage({ searchParams }: PageProps) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const { duplicate, fromDraft } = await searchParams;
  const dupSlug = duplicate ? sanitizeSlug(duplicate) : null;
  let initial: Parameters<typeof PostForm>[0]["initial"] | undefined;

  if (dupSlug) {
    const source = await loadDuplicateSource(dupSlug, fromDraft === "1");
    if (source) {
      initial = {
        title: `${source.title} (copy)`,
        slug: "",
        date: source.date,
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
        seoTitle: "seoTitle" in source ? (source.seoTitle ?? "") : "",
        seoDescription: "seoDescription" in source ? (source.seoDescription ?? "") : "",
        focusKeyword: "focusKeyword" in source ? (source.focusKeyword ?? "") : "",
        noindex: "noindex" in source ? source.noindex === true : false,
        membersOnly: "membersOnly" in source ? source.membersOnly === true : false,
        dealNote: "dealNote" in source ? source.dealNote === true : false,
        itinerary:
          "itinerary" in source ? (source.itinerary ?? undefined) : undefined,
      };
    }
  }

  const destinations = getAllDestinations().map((d) => ({
    slug: d.slug,
    name: d.name,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/cms/posts"
          className="text-sm text-link transition hover:text-accent"
        >
          ← Posts
        </Link>
        <p className="eyebrow mt-6 text-accent">Create</p>
        <h1 className="font-display mt-2 text-display text-heading">
          {dupSlug ? "Duplicate post" : "New post"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Publishing writes{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            src/content/posts/&#123;slug&#125;.json
          </code>{" "}
          and updates the posts index on GitHub. Use Save draft to keep work in{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            drafts/
          </code>
          .
        </p>
      </div>
      <PostForm
        destinations={destinations}
        mode="create"
        initial={initial}
        linkCatalog={getSeoLinkCatalog()}
      />
    </div>
  );
}
