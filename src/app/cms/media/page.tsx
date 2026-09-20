import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthorPhotoForm } from "@/components/cms/AuthorPhotoForm";
import { site } from "@/data/content";
import { isCmsAuthenticated } from "@/lib/cms/auth";

export const dynamic = "force-dynamic";

export default async function CmsMediaPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow text-accent">Brand assets</p>
        <h1 className="font-display mt-2 text-display text-heading">Media</h1>
        <p className="mt-3 text-sm text-muted">
          Upload the author photo used on About, blog bylines, footer, and the
          media kit. JPEG, PNG, or WebP up to ~2.5MB. Commits to{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            public/brand
          </code>{" "}
          via GitHub.
        </p>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-border bg-surface-soft px-5 py-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
            Author photo
          </h2>
        </div>
        <div className="p-5 md:p-6">
          <AuthorPhotoForm currentSrc={site.authorPhoto} />
        </div>
      </section>

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
