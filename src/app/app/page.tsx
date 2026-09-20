import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/pages/SitePage";
import { site } from "@/data/content";

export const metadata: Metadata = {
  title: "About this site & Google Sign-In",
  description:
    "Fernandes Journeys is a personal travel journal. Google Sign-In is only for optional reader saves and the owner’s private CMS — not a consumer login product.",
  alternates: { canonical: "/app" },
};

export default function AppPurposePage() {
  return (
    <SitePage
      label="Google OAuth app"
      title="About Fernandes Journeys & Google Sign-In"
      description="Public information about the Fernandes Journeys website and why it uses Google Sign-In."
      crumbs={[
        { href: "/", label: "Home" },
        { label: "App purpose" },
      ]}
    >
      <div className="panel mt-10 space-y-6 p-6 text-base leading-relaxed text-text md:mt-12 md:p-8">
        <dl className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:gap-x-6 sm:gap-y-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-muted">
            App name
          </dt>
          <dd className="font-semibold text-heading">{site.name}</dd>

          <dt className="text-sm font-semibold uppercase tracking-wide text-muted">
            What it is
          </dt>
          <dd>
            A personal travel journal by {site.authorName} — destinations from
            past trips, trip notes, and photos from the road. Public stories are
            readable without signing in.
          </dd>

          <dt className="text-sm font-semibold uppercase tracking-wide text-muted">
            Why Google Sign-In
          </dt>
          <dd>
            Google Sign-In is <strong>not</strong> a consumer social login
            product on this site. It is used only so (1) readers may optionally
            save posts to an account, and (2) authorized admins can sign in to
            the private content management system at <code>/cms</code> to publish
            and edit travel stories. Most visitors never need to sign in.
          </dd>

          <dt className="text-sm font-semibold uppercase tracking-wide text-muted">
            Home page
          </dt>
          <dd>
            <a
              href="https://www.fernandesjourneys.com"
              className="text-link transition hover:text-accent"
            >
              https://www.fernandesjourneys.com
            </a>
          </dd>

          <dt className="text-sm font-semibold uppercase tracking-wide text-muted">
            Privacy policy
          </dt>
          <dd>
            <Link
              href="/privacy"
              className="text-link transition hover:text-accent"
            >
              https://www.fernandesjourneys.com/privacy
            </Link>
          </dd>

          <dt className="text-sm font-semibold uppercase tracking-wide text-muted">
            Contact
          </dt>
          <dd>
            <a
              href={`mailto:${site.email}`}
              className="text-link transition hover:text-accent"
            >
              {site.email}
            </a>
          </dd>
        </dl>
      </div>

      <aside className="panel-soft mt-8 p-6 md:p-8">
        <p className="eyebrow">For visitors</p>
        <p className="font-display mt-2 text-lg font-bold text-heading">
          No login required to read the journal
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text">
          Explore places, stories, and guides freely. Sign in with Google only if
          you want to save posts — or if you are an authorized admin editing the
          CMS.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/" className="btn btn-ink btn-block sm:w-auto">
            Back to home
          </Link>
          <Link
            href="/privacy"
            className="btn btn-secondary btn-block sm:w-auto"
          >
            Privacy policy
          </Link>
          <Link
            href="/policies"
            className="btn btn-secondary btn-block sm:w-auto"
          >
            All policies
          </Link>
          <Link
            href="/start-here"
            className="btn btn-secondary btn-block sm:w-auto"
          >
            Start here
          </Link>
        </div>
      </aside>
    </SitePage>
  );
}
