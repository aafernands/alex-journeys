import Link from "next/link";
import { redirect } from "next/navigation";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { CODE_ONLY_PAGE_ROUTES } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function CmsHelpPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="eyebrow text-accent">Guide</p>
        <h1 className="font-display mt-2 text-display text-heading">Help</h1>
        <p className="mt-3 text-sm text-muted md:text-base">
          Short publish checklist for Fernandes Journeys. Full setup notes live
          in{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            docs/CMS.md
          </code>
          .
        </p>
      </div>

      <section className="panel space-y-3 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Publish a story
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-text">
          <li>
            Open{" "}
            <Link href="/cms/posts" className="text-link hover:text-accent">
              Posts
            </Link>{" "}
            → <strong>New post</strong> (or Edit).
          </li>
          <li>
            Fill title (slug auto-fills), date, excerpt (~150–160 chars for SEO),
            optional featured image + destinations, then body.
          </li>
          <li>
            <strong>Save draft</strong> writes{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">
              src/content/drafts/&#123;slug&#125;.json
            </code>
            . <strong>Publish</strong> writes the post + updates{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">_index.json</code>{" "}
            on GitHub <code className="rounded bg-surface-soft px-1 text-xs">main</code>.
          </li>
          <li>Wait for the Vercel deploy, then open /blog/&#123;slug&#125;.</li>
        </ol>
        <p className="text-sm text-muted">
          Tip: ⌘/Ctrl+S saves a draft on create, or publishes when editing a live
          post. Leaving with unsaved changes shows a browser warning.
        </p>
      </section>

      <section className="panel space-y-3 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Pages & destinations
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-text">
          <li>
            <Link href="/cms/pages" className="text-link hover:text-accent">
              Pages
            </Link>{" "}
            edits JSON under{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">
              src/content/pages
            </code>{" "}
            (culinary, policies, travel-wallet today).
          </li>
          <li>
            <Link href="/cms/destinations" className="text-link hover:text-accent">
              Destinations
            </Link>{" "}
            updates the continent/country tree (map, climate, itinerary).
          </li>
          <li>
            <Link href="/cms/media" className="text-link hover:text-accent">
              Media
            </Link>{" "}
            updates the author photo site-wide after redeploy.
          </li>
        </ul>
      </section>

      <section className="panel space-y-3 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Env readiness (no secrets shown)
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-text">
          <li>
            Auth: OAuth (Google/GitHub + allowlist) and/or{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">CMS_PASSCODE</code>.
          </li>
          <li>
            Publishing:{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">
              CMS_GITHUB_TOKEN
            </code>{" "}
            with contents:write on the repo.
          </li>
          <li>Dashboard shows whether auth + GitHub token look configured.</li>
        </ul>
      </section>

      <section className="panel space-y-3 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Code-only routes
        </h2>
        <p className="text-sm text-muted">
          These are React pages, not JSON CMS content:
        </p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {CODE_ONLY_PAGE_ROUTES.map((r) => (
            <li key={r.path} className="text-sm text-muted">
              <span className="font-mono text-heading">{r.path}</span> — {r.note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
