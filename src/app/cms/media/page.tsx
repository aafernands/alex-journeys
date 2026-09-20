import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthorPhotoForm } from "@/components/cms/AuthorPhotoForm";
import { MediaLibrary } from "@/components/cms/MediaLibrary";
import { site } from "@/data/content";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { readMediaIndex } from "@/lib/cms/media";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string }>;

export default async function CmsMediaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const sp = await searchParams;
  const tab = sp.tab === "author" ? "author" : "library";
  const index = readMediaIndex();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="eyebrow text-accent">Brand &amp; post assets</p>
        <h1 className="font-display mt-2 text-display text-heading">Media</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Browse project-hosted images used in published posts (stored under{" "}
          <code className="text-xs">/media/</code>), add new ones by URL or
          upload, and pick them from the post editor. Author photo remains under
          its own tab.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Link
          href="/cms/media"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "library"
              ? "bg-accent/15 text-heading ring-1 ring-accent/30"
              : "text-text hover:bg-surface-soft"
          }`}
        >
          Library ({index.count})
        </Link>
        <Link
          href="/cms/media?tab=author"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "author"
              ? "bg-accent/15 text-heading ring-1 ring-accent/30"
              : "text-text hover:bg-surface-soft"
          }`}
        >
          Author photo
        </Link>
      </div>

      {tab === "author" ? (
        <section className="panel mx-auto max-w-2xl overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              Author photo
            </h2>
          </div>
          <div className="p-5 md:p-6">
            <p className="mb-5 text-sm text-muted">
              Used on About, blog bylines, footer, and the media kit. JPEG, PNG,
              or WebP up to ~2.5MB. Commits to{" "}
              <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
                public/brand
              </code>{" "}
              via GitHub.
            </p>
            <AuthorPhotoForm currentSrc={site.authorPhoto} />
          </div>
        </section>
      ) : (
        <MediaLibrary initialItems={index.items} updatedAt={index.updatedAt} />
      )}

      <p className="text-sm text-muted">
        Need the publish flow? See{" "}
        <Link href="/cms/help" className="text-link hover:text-accent">
          Help
        </Link>
        .
      </p>
    </div>
  );
}
