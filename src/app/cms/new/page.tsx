import Link from "next/link";
import { redirect } from "next/navigation";
import { PostForm } from "@/components/cms/PostForm";
import { getAllDestinations } from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";

export const dynamic = "force-dynamic";

export default async function CmsNewPostPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

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
        <p className="eyebrow mt-6 text-accent">Create</p>
        <h1 className="font-display mt-2 text-display text-heading">
          New post
        </h1>
        <p className="mt-3 text-sm text-muted">
          Publishing writes{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            src/content/posts/&#123;slug&#125;.json
          </code>{" "}
          and updates the posts index on GitHub.
        </p>
      </div>
      <PostForm destinations={destinations} mode="create" />
    </div>
  );
}
