import type { Metadata } from "next";
import Link from "next/link";
import { PostContent } from "@/components/blog/PostContent";
import { SitePage } from "@/components/pages/SitePage";
import { site } from "@/data/content";
import { asRecord, asString } from "@/lib/cms-section-utils";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("app", PAGE_DEFAULTS.app);
  return {
    title: "About this site & Google Sign-In",
    description: page.description,
    alternates: { canonical: "/app" },
  };
}

export default function AppPurposePage() {
  const page = getPageWithFallback("app", PAGE_DEFAULTS.app);
  const aside = asRecord(page.sections?.visitorAside);

  return (
    <SitePage
      cmsSlug="app"
      label={page.label}
      title={page.title}
      description={page.description}
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
            Details
          </dt>
          <dd>
            <PostContent html={page.contentHtml} />
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
            Terms of use
          </dt>
          <dd>
            <Link
              href="/terms"
              className="text-link transition hover:text-accent"
            >
              https://www.fernandesjourneys.com/terms
            </Link>
          </dd>

          <dt className="text-sm font-semibold uppercase tracking-wide text-muted">
            Affiliate disclosure
          </dt>
          <dd>
            <Link
              href="/affiliate-disclosure"
              className="text-link transition hover:text-accent"
            >
              https://www.fernandesjourneys.com/affiliate-disclosure
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
        <p className="eyebrow">
          {asString(aside.eyebrow, "For visitors")}
        </p>
        <p className="font-display mt-2 text-lg font-bold text-heading">
          {asString(aside.title, "No login required to read the journal")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text">
          {asString(
            aside.body,
            "Explore places, stories, and guides freely. Sign in with Google only if you want to save posts — or if you are an authorized admin editing the CMS.",
          )}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/" className="btn btn-ink btn-block sm:w-auto">
            Back to home
          </Link>
          <Link href="/privacy" className="btn btn-secondary btn-block sm:w-auto">
            Privacy policy
          </Link>
          <Link href="/terms" className="btn btn-secondary btn-block sm:w-auto">
            Terms of use
          </Link>
          <Link
            href="/affiliate-disclosure"
            className="btn btn-secondary btn-block sm:w-auto"
          >
            Affiliate disclosure
          </Link>
          <Link href="/policies" className="btn btn-secondary btn-block sm:w-auto">
            Policies hub
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
