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
            optional featured image + destinations (Place pages), optional Guides
            → Plan a trip, then story Content. For day-by-day trips, enable{" "}
            <strong>Trip timeline</strong> below Content (structured data, not
            HTML in the editor).
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
          <li>Wait for the Vercel deploy, then open /&#123;slug&#125;.</li>
        </ol>
        <p className="text-sm text-muted">
          Tip: ⌘/Ctrl+S saves a draft on create, or publishes when editing a live
          post. Leaving with unsaved changes shows a browser warning.
        </p>
      </section>

      <section className="panel space-y-3 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Write an itinerary (Trip timeline)
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-text">
          <li>
            <Link href="/cms/new" className="text-link hover:text-accent">
              New post
            </Link>
            → write the story in <strong>Content</strong> (intro, photos,
            reflections).
          </li>
          <li>
            Scroll to <strong>Trip timeline</strong> → check{" "}
            <strong>This post includes a day-by-day itinerary</strong>.
          </li>
          <li>
            Add an itinerary title + intro, then days (reorder with Up/Down).
            Inside each day, add Morning / Afternoon / Evening blocks (or a
            custom time), optional place, and what you did.
          </li>
          <li>
            Check the matching <strong>Destination</strong> (e.g. Canada) so the
            story appears on that Place page&apos;s related posts. Destinations are
            Place pages — not WordPress categories.
          </li>
          <li>
            Optionally check <strong>List under Guides → Plan a trip</strong> so
            it also shows on{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">
              /guides/plan-a-trip
            </code>
            .
          </li>
          <li>Publish — the public post shows a visual timeline after the story.</li>
        </ol>
      </section>

      <section className="panel space-y-3 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Pages, hubs &amp; homepage
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-text">
          <li>
            <Link href="/cms/pages" className="text-link hover:text-accent">
              Pages
            </Link>{" "}
            edits JSON under{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">
              src/content/pages
            </code>
            — including About, Contact, Start here, Media kit, App purpose,
            Guides/Tools/Destinations/Blog intros, policies, and legal pages.
            Culinary, bucket-list, and travel-wallet JSON may remain as archive;
            those URLs 301 into Guides. Hub <em>cards</em> stay data-driven;
            editable fields are title, description, intro, and optional sections
            JSON.
          </li>
          <li>
            <Link href="/cms/design" className="text-link hover:text-accent">
              Website design
            </Link>{" "}
            controls the homepage hero (headline photo only), the featured
            field-note slideshow, <strong>and</strong> major homepage section
            chrome (Start here, Places, Latest, Guides, Tools, OAuth note, Author
            intro) via{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">
              src/data/site-design.json
            </code>
            .
          </li>
          <li>
            <Link href="/cms/destinations" className="text-link hover:text-accent">
              Destinations
            </Link>{" "}
            updates the continent/country tree (map, climate, itinerary). Country
            pages themselves are not “Pages” — use Destinations.
          </li>
          <li>
            <Link href="/cms/media" className="text-link hover:text-accent">
              Media
            </Link>{" "}
            is the image library plus the author photo tab.
          </li>
          <li>
            New CMS page slugs without a dedicated{" "}
            <code className="rounded bg-surface-soft px-1 text-xs">
              src/app/&#123;slug&#125;
            </code>{" "}
            route are served by the catch-all when they do not collide with a post
            or destination.
          </li>
        </ul>
      </section>

      <section className="panel space-y-3 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Change the homepage
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-text">
          <li>
            Open{" "}
            <Link href="/cms/design" className="text-link hover:text-accent">
              Website design
            </Link>
            .
          </li>
          <li>
            Under <strong>Homepage hero image</strong>, choose from the media
            library or upload. Set alt text and window chrome location label.
          </li>
          <li>
            Edit hero tagline, subtitle, CTAs, then scroll to{" "}
            <strong>Homepage sections</strong> for Start here / Places / Latest /
            Guides / Tools / OAuth note / Author intro.
          </li>
          <li>
            <strong>Save website design</strong> → wait for Vercel → live homepage
            updates.
          </li>
        </ol>
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
          Code-only / app routes
        </h2>
        <p className="text-sm text-muted">
          These are app/auth/system routes — not marketing pages. Individual posts
          and destination country pages are edited under Posts and Destinations.
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
